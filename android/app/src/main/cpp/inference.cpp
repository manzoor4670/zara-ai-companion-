#include "inference.h"
#include "llama.h"
#include <atomic>
#include <chrono>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <vector>
namespace {
std::atomic<uint64_t> epoch{0};
std::mutex inference_mutex;
std::once_flag init;
struct Work {
    uint64_t expected;
    std::chrono::steady_clock::time_point deadline;
    bool stopped() const { return epoch.load() != expected || std::chrono::steady_clock::now() > deadline; }
};
bool abort_work(void *p) { return static_cast<Work *>(p)->stopped(); }
bool load_progress(float, void *p) { return !abort_work(p); }
void quiet_log(ggml_log_level, const char *, void *) {}
}
uint64_t zara_epoch() { return epoch.load(); }
void zara_cancel() { ++epoch; }
std::string zara_generate(const std::string &path,const std::string &prompt,uint64_t expected,
                         const std::function<void(const std::string &)> &progress) {
    std::lock_guard<std::mutex> guard(inference_mutex);
    Work work{expected,std::chrono::steady_clock::now()+std::chrono::seconds(90)};
    if(work.stopped()) throw std::runtime_error("cancelled");
    if(prompt.empty() || prompt.size()>12000) throw std::runtime_error("prompt-too-long");
    std::call_once(init,[]{llama_log_set(quiet_log,nullptr);llama_backend_init();});
    auto mp=llama_model_default_params();mp.n_gpu_layers=0;mp.load_mode=LLAMA_LOAD_MODE_MMAP;
    mp.progress_callback=load_progress;mp.progress_callback_user_data=&work;
    std::unique_ptr<llama_model,decltype(&llama_model_free)> model(llama_model_load_from_file(path.c_str(),mp),llama_model_free);
    if(!model) throw std::runtime_error(work.stopped()?"cancelled":"model-load-failed");
    if(llama_model_n_params(model.get())>700000000ULL || llama_model_has_encoder(model.get())) throw std::runtime_error("model-not-supported");
    const auto *vocab=llama_model_get_vocab(model.get());
    int count=-llama_tokenize(vocab,prompt.data(),static_cast<int>(prompt.size()),nullptr,0,true,true);
    if(count<=0 || count>880) throw std::runtime_error("prompt-too-long");
    std::vector<llama_token> tokens(count);
    if(llama_tokenize(vocab,prompt.data(),static_cast<int>(prompt.size()),tokens.data(),count,true,true)<0)throw std::runtime_error("tokenize-failed");
    auto cp=llama_context_default_params();cp.n_ctx=1024;cp.n_batch=128;cp.n_ubatch=128;
    cp.n_threads=2;cp.n_threads_batch=2;cp.offload_kqv=false;cp.op_offload=false;
    cp.abort_callback=abort_work;cp.abort_callback_data=&work;
    std::unique_ptr<llama_context,decltype(&llama_free)> ctx(llama_init_from_model(model.get(),cp),llama_free);
    if(!ctx)throw std::runtime_error("context-load-failed");
    std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)> sampler(llama_sampler_chain_init(llama_sampler_chain_default_params()),llama_sampler_free);
    if(!sampler)throw std::runtime_error("sampler-failed");
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_top_k(40));
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_top_p(0.9f,1));
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_temp(0.6f));
    llama_sampler_chain_add(sampler.get(),llama_sampler_init_dist(1234));
    for(int offset=0;offset<count;offset+=128){
        if(work.stopped())throw std::runtime_error("cancelled");
        const int n=std::min(128,count-offset);
        auto batch=llama_batch_get_one(tokens.data()+offset,n);
        if(llama_decode(ctx.get(),batch)!=0)throw std::runtime_error(work.stopped()?"cancelled":"decode-failed");
    }
    std::string answer;
    for(int i=0;i<128;i++){
        if(work.stopped())throw std::runtime_error("cancelled");
        llama_token token=llama_sampler_sample(sampler.get(),ctx.get(),-1);
        if(llama_vocab_is_eog(vocab,token))break;
        std::vector<char> piece(256);
        int n=llama_token_to_piece(vocab,token,piece.data(),piece.size(),0,false);
        if(n<0){piece.resize(-n);n=llama_token_to_piece(vocab,token,piece.data(),piece.size(),0,false);}
        if(n<0 || n>16384)throw std::runtime_error("output-failed");
        answer.append(piece.data(),n);
        if(progress && i%8==0)progress(answer);
        if(i==127)break;
        auto batch=llama_batch_get_one(&token,1);
        if(llama_decode(ctx.get(),batch)!=0)throw std::runtime_error(work.stopped()?"cancelled":"decode-failed");
    }
    if(work.stopped())throw std::runtime_error("cancelled");
    if(answer.empty())throw std::runtime_error("empty-answer");
    return answer;
}

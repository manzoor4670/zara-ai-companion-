#include "inference.h"
#include <iostream>
#include <stdexcept>
#include <thread>
#include <chrono>
#include <fstream>
#include <iterator>
int main(int argc,char **argv){
    if(argc!=2&&argc!=3)return 2;
    try{
        std::string prompt="<|im_start|>system\nYou are a helpful assistant. Give one short sentence.<|im_end|>\n<|im_start|>user\nSay hello.<|im_end|>\n<|im_start|>assistant\n";
        if(argc==3){std::ifstream in(argv[2]);if(!in)return 8;prompt.assign(std::istreambuf_iterator<char>(in),std::istreambuf_iterator<char>());}
        const auto output=zara_generate(argv[1],prompt,zara_epoch());
        if(output.empty())return 3;
        std::cout<<"Real "<<sizeof(void*)*8<<"-bit model inference: "<<output<<"\n";
        if(argc==3)return 0;
        auto old=zara_epoch();zara_cancel();
        try{zara_generate(argv[1],prompt,old);return 4;}catch(const std::runtime_error &e){if(std::string(e.what())!="cancelled")return 5;}
        try{zara_generate(argv[1],std::string(13000,'x'),zara_epoch());return 6;}catch(const std::runtime_error &e){if(std::string(e.what())!="prompt-too-long")return 7;}
        std::cout<<"Stale request cancellation and prompt bound passed\n";
        return 0;
    }catch(const std::exception &e){std::cerr<<e.what()<<"\n";return 1;}
}

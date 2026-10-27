#include "inference.h"
#include <iostream>
#include <stdexcept>
#include <thread>
#include <chrono>
int main(int argc,char **argv){
    if(argc!=2)return 2;
    try{
        const auto prompt="<|im_start|>system\nYou are a helpful assistant. Give one short sentence.<|im_end|>\n<|im_start|>user\nSay hello.<|im_end|>\n<|im_start|>assistant\n";
        const auto output=zara_generate(argv[1],prompt,zara_epoch());
        if(output.empty())return 3;
        std::cout<<"Real model inference: "<<output<<"\n";
        auto old=zara_epoch();zara_cancel();
        try{zara_generate(argv[1],prompt,old);return 4;}catch(const std::runtime_error &e){if(std::string(e.what())!="cancelled")return 5;}
        try{zara_generate(argv[1],std::string(13000,'x'),zara_epoch());return 6;}catch(const std::runtime_error &e){if(std::string(e.what())!="prompt-too-long")return 7;}
        std::cout<<"Stale request cancellation and prompt bound passed\n";
        return 0;
    }catch(const std::exception &e){std::cerr<<e.what()<<"\n";return 1;}
}

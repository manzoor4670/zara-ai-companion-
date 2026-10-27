#pragma once
#include <cstdint>
#include <functional>
#include <string>
uint64_t zara_epoch();
void zara_cancel();
std::string zara_generate(const std::string &path, const std::string &prompt, uint64_t epoch,
                         const std::function<void(const std::string &)> &progress = {});

# Copyright (c) 2022-2025, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# See LICENSE for license information.

add_executable(test_operator
               test_qdq.cu
               test_cast_transpose.cu
               test_transpose.cu
               test_cast_transpose_dbias.cu
               test_cast_transpose_dbias_dgelu.cu
               test_cast_transpose_dgeglu.cu
               test_act.cu
               test_normalization.cu
               test_multi_cast_transpose.cu
               test_multi_padding.cu
               test_causal_softmax.cu
               ../test_common.cu)

list(APPEND test_operator_LINKER_LIBS CUDA::cudart GTest::gtest_main ${TE_LIB} CUDA::nvrtc CUDNN::cudnn)

target_link_libraries(test_operator PUBLIC ${test_operator_LINKER_LIBS})
target_compile_options(test_operator PRIVATE -O2)

include(GoogleTest)
gtest_discover_tests(test_operator)

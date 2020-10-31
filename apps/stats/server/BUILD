load("@com_github_grpc_grpc//bazel:cc_grpc_library.bzl", "cc_grpc_library")

proto_library(
    name = "stats_proto",
    srcs = ["stats.proto"],
    deps = ["@com_google_protobuf//:any_proto"],
)

proto_library(
    name = "stats_svc_proto",
    srcs = ["stats_svc.proto"],
    deps = ["stats_proto"],
)

cc_proto_library(
    name = "stats_cc_proto",
    deps = [":stats_proto"],
)

cc_proto_library(
    name = "stats_svc_cc_proto",
    deps = [":stats_svc_proto"],
)

cc_grpc_library(
    name = "stats_svc_grpc",
    srcs = [":stats_svc_proto"],
    grpc_only = True,
    deps = [":stats_svc_cc_proto"],
)

cc_library(
    name = "hello-time",
    srcs = [
        "foo/bar/baz.h",
        "hello-time.cc",
    ],
    hdrs = ["hello-time.h"],
    copts = ["-Ilib/foo"],
    visibility = ["//main:__pkg__"],
)

cc_binary(
    name = "stats_server",
    srcs = [
        "stats_server.cc",
        "stats_server.h",
    ],
    deps = [
        ":stats_svc_grpc",
        # http_archive made this label available for binding
        "@com_github_grpc_grpc//:grpc++",
    ],
)
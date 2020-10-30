cc_proto_library(
    name = "stats_cc_proto",
    deps = [":stats_proto"],
)

cc_proto_library(
    name = "stats_svc_cc_proto",
    deps = [":stats_svc_proto"],
)

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

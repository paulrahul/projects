#include "stats_svc.grpc.pb.h"

using grpc::ChannelInterface;

class StatsClient {
    public:
        StatsClient(std::shared_ptr<ChannelInterface> channel);

        ~StatsClient();

        void SendRequest();

        void SendAsyncRequest();
    
    private:
        std::unique_ptr<FocusStatsService::Stub> stub_;
};

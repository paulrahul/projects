#include "stats_client.h"

#include <grpcpp/grpcpp.h>

using namespace std;

StatsClient::StatsClient(shared_ptr<ChannelInterface> channel)
    : stub_(FocusStatsService::NewStub(channel)) {
}

void StatsClient::SendRequest() {

}

int main() {
    StatsClient client(grpc::CreateChannel(
        "0.0.0.0.:9090", grpc::InsecureChannelCredentials()));

    client.SendRequest();

    return 0;
}
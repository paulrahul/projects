#include "stats_client.h"

#include <grpcpp/grpcpp.h>

using namespace std;

using grpc::ClientContext;
using grpc::Status;

StatsClient::StatsClient(shared_ptr<ChannelInterface> channel)
    : stub_(FocusStatsService::NewStub(channel)) {
}

void StatsClient::SendRequest() {
    FocusWriteRequest req;
    req.set_request_id(123);
    
    FocusWriteResponse res;

    ClientContext context;

    Status status = stub_->FocusWrite(&context, req, &res);
    if (status.ok()) {
        cout << "Received response: " << res.ShortDebugString() << endl;
    } else {
        cout << "Failed with error: " << status.error_code() << ": "
             << status.error_message() << endl;
    }
}

int main() {
    StatsClient client(grpc::CreateChannel(
        "localhost:50051", grpc::InsecureChannelCredentials()));

    client.SendRequest();

    return 0;
}

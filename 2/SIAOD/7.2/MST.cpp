#include <algorithm>
#include <climits>
#include <iostream>
#include <numeric>
#include <set>
#include <vector>

using namespace std;

const long long cMaxDist = LLONG_MAX;

struct Edge {
  size_t from;
  size_t too;
  long long weight;
};

class Graph {
private:
vector<vector<pair<size_t, long long>>> graph_;

public:
    bool is_oriented;
    explicit Graph(const size_t count_vertex, const vector<Edge>& edges, const bool mark_is_oriented = true) : is_oriented(mark_is_oriented) {
        graph_.resize(count_vertex + 1);
        for (auto [from, too, weight] : edges) {
            graph_[from].push_back({too, weight});
            if (!is_oriented) {
                graph_[too].push_back({from, weight});
            }
        }
    }

    auto GetAdjacent(const size_t vertex) const { return graph_[vertex]; }

    size_t Size() const { return graph_.size(); }
};

pair<long long, vector<Edge>> FindMST(const Graph& graph) {
    vector<pair<long long, size_t>> dist(graph.Size(), {cMaxDist, 0});  // {dist, from}
    dist[1] = {0, 0};
    set<pair<long long, size_t>> best_vertices = {{0, 1}};  // {dist, vertex}
    vector<bool> used(graph.Size());

    while (!best_vertices.empty()) {
        size_t best_v = best_vertices.begin()->second;
        best_vertices.erase(best_vertices.begin());
        used[best_v] = true;

        for (auto [too, weight] : graph.GetAdjacent(best_v)) {
            if (weight < dist[too].first && !used[too]) {
                best_vertices.erase({dist[too].first, too});
                dist[too] = {weight, best_v};
                best_vertices.insert({dist[too].first, too});
            }
        }
    }

    long long mst_cost = 0;
    vector<Edge> mst;
    for (size_t too = 2; too < graph.Size(); ++too) {
        mst_cost += dist[too].first;
        mst.push_back({dist[too].second, too, dist[too].first});
    }
    return {mst_cost, mst};
}

int main() {
    size_t count_vertices;
    size_t count_edges;
    cout << "Введите количество вершин: ";
    cin >> count_vertices;

    cout << "Введите количество ребер: ";
    cin >> count_edges;

    vector<Edge> edges(count_edges);
    for (auto& [from, too, weight] : edges) {
    cin >> from >> too >> weight;
    }
    cout << endl;

    Graph graph(count_vertices, edges, false);

    auto [mst_cost, mst] = FindMST(graph);
    cout << mst_cost << '\n';
    for (const auto& [from, too, weight] : mst) {
    cout << from << ' ' << too << ' ' << weight << '\n';
    }
}
/*
6
10
1 2 2
1 3 6
1 4 4
2 4 7
2 5 8
3 4 8
3 6 5
4 5 2
4 6 8
5 6 4
*/
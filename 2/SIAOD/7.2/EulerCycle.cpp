#include <algorithm>
#include <iostream>
#include <optional>
#include <unordered_set>
#include <vector>
#include <Windows.h>

using namespace std;

struct Edge {
  size_t from;
  size_t too;
};

class Graph {
    private:
    vector<unordered_set<size_t>> graph_;

    public:
    bool is_oriented;

    explicit Graph(const size_t count_vertex, const vector<Edge>& edges, const bool mark_is_oriented = true) : is_oriented(mark_is_oriented) {
        graph_.resize(count_vertex + 1);
        for (const auto& [from, too] : edges) {
            graph_[from].insert(too);
            if (!is_oriented) {
                graph_[too].insert(from);
            }
        }
    }

    unordered_set<size_t> GetAdjacent(const size_t vertex) const {
        return graph_[vertex];
    }

    size_t Size() const { return graph_.size() - 1; }

    void AddEdge(const Edge& edge) {
        graph_[edge.from].insert(edge.too);
        if (!is_oriented) {
           graph_[edge.too].insert(edge.from);
        }
    }

    void RemoveEdge(const Edge& edge) {
        graph_[edge.from].erase(edge.too);
        if (!is_oriented) {
            graph_[edge.too].erase(edge.from);
        }
    }
};

void FindEulerCycleRecursion(const size_t from, Graph& graph,vector<size_t>& cycle) {
    while (!graph.GetAdjacent(from).empty()) {
        size_t too = *graph.GetAdjacent(from).begin();
        graph.RemoveEdge({from, too});
        FindEulerCycleRecursion(too, graph, cycle);
    }
    cycle.push_back(from);
}

void DFS(const size_t from, const Graph& graph, vector<bool>& used, const int parent = -1) {
    used[from] = true;

    for (const auto& too : graph.GetAdjacent(from)) {
        if (!used[too] && too != parent) {
            DFS(too, graph, used, from);
        }
    }
}

bool CheckEvenDegrees(const Graph& graph) {
    if (!graph.is_oriented) {
        vector<size_t> degrees(graph.Size() + 1);
        for (size_t from = 1; from < graph.Size() + 1; ++from) 
            if (graph.GetAdjacent(from).size() % 2 == 1) return false;
    }
    else {
        vector<size_t> in_degree(graph.Size() + 1);
        vector<size_t> out_degree(graph.Size() + 1);

        for (size_t from = 1; from < graph.Size() + 1; ++from) {
            out_degree[from] = graph.GetAdjacent(from).size();
            for (const auto& too : graph.GetAdjacent(from)) {
                ++in_degree[too];
            }
        }

        for (size_t vertex = 1; vertex < graph.Size() + 1; ++vertex) {
            if (in_degree[vertex] != out_degree[vertex]) {
                return false;
            }
        }
    }

    return true;
}

optional<vector<size_t>> FindEulerCycle(Graph& graph) {
    vector<bool> used(graph.Size() + 1);
    DFS(1, graph, used);

    for (size_t vertex = 1; vertex < graph.Size() + 1; ++vertex) {
        if (!used[vertex] && graph.GetAdjacent(vertex).size() > 0) {
            return nullopt;
        }
    }

    if (!CheckEvenDegrees(graph)) {
        return nullopt;
    }

    vector<size_t> cycle;
    FindEulerCycleRecursion(1, graph, cycle);
    reverse(cycle.begin(), cycle.end());
    return cycle;
}

int main() {
    SetConsoleCP(1251);
    SetConsoleOutputCP(1251);
    size_t count_vertices;
    size_t count_edges;
    cout << "Введите количество вершин: ";
    cin >> count_vertices;

    cout << "Введите количество ребер: ";
    cin >> count_edges;

    Graph graph(count_vertices, {}, false);  // true если граф ориентированный
    for (size_t i = 0; i < count_edges; ++i) {
        Edge edge;
        cin >> edge.from >> edge.too;
        graph.AddEdge(edge);
    }

    auto cycle = FindEulerCycle(graph);
    if (!cycle) {
        cout << "Нет цикла Эйлера\n";
        return 0;
    }
    cout << "Цикл Эйлера: ";
    for (const auto& vertex : cycle.value()) {
        cout << vertex << " ";
    }
    return 0;
}

/*
6
10
1 2
1 3
1 4
2 4
2 5
3 4
3 6
4 5
4 6
5 6
*/
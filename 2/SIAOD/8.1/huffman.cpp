#include <iostream>
#include <queue>
#include <unordered_map>
#include <vector>
#include <string>
#include <iomanip>
#include <fstream>
using namespace std;

struct Node {
    char ch;
    int freq;
    Node *left, *right;
    
    Node(char c, int f) : ch(c), freq(f), left(nullptr), right(nullptr) {}
};

struct Compare {
    bool operator()(Node* a, Node* b) {
        return a->freq > b->freq;
    }
};

void buildCodes(Node* root, const string& str, unordered_map<char, string>& huffmanCode) {
    if (!root) return;
    if (!root->left && !root->right) huffmanCode[root->ch] = str;
    buildCodes(root->left, str + "0", huffmanCode);
    buildCodes(root->right, str + "1", huffmanCode);
}

unordered_map<char, int> frequencyAnalysis(const string& text) {
    unordered_map<char, int> freq;
    for (char ch : text) freq[ch]++;
    return freq;
}

Node* buildHuffmanTree(const unordered_map<char, int>& freq) {
    priority_queue<Node*, vector<Node*>, Compare> pq;
    for (auto pair : freq) pq.push(new Node(pair.first, pair.second));
    while (pq.size() > 1) {
        Node *left = pq.top(); pq.pop();
        Node *right = pq.top(); pq.pop();
        Node *node = new Node('\0', left->freq + right->freq);
        node->left = left;
        node->right = right;
        pq.push(node);
    }
    return pq.top();
}

string encode(const string& text, const unordered_map<char, string>& huffmanCode) {
    string encoded;
    for (char ch : text) encoded += huffmanCode.at(ch);
    return encoded;
}

string decode(const string& encoded, Node* root) {
    string decoded;
    Node* current = root;
    for (char bit : encoded) {
        current = (bit == '0') ? current->left : current->right;
        if (!current->left && !current->right) {
            decoded += current->ch;
            current = root;
        }
    }
    return decoded;
}


int main() {
    string text;
    ifstream in("input.txt"); // окрываем файл для чтения
    if (in.is_open())
    {
        getline(in, text);
    }
    in.close(); 

    auto freq = frequencyAnalysis(text);
    
    cout << "Frequency analysis:" << endl;
    cout << left << setw(10) << "Character" 
         << setw(10) << "Frequency" 
         << setw(15) << "Probability" << endl;
    cout << string(35, '-') << endl;
    int totalSymbols = text.size();
    for (const auto& pair : freq) {
        cout << left << setw(10) << pair.first 
             << setw(10) << pair.second 
             << setw(15) << fixed << setprecision(3) 
             << static_cast<double>(pair.second) / totalSymbols << endl;
    }
    cout << endl;

    Node* root = buildHuffmanTree(freq);
    
    unordered_map<char, string> huffmanCode;
    buildCodes(root, "", huffmanCode);
    
    string encoded = encode(text, huffmanCode);
    ofstream out;
    out.open("encoded.bin");
    if (out.is_open())
    {
        out << encoded << endl;
    }
    string decoded = decode(encoded, root);
    
    cout << "Original text: " << text << endl << endl;
    cout << "Encoded text: " << encoded << endl << endl;
    cout << "Decoded text: " << decoded << endl << endl;
    cout << "\nHuffman Codes:" << endl;
    for (auto pair : huffmanCode) {
        cout << pair.first << ": " << pair.second << endl;
    }
    int originalSize = text.size() * 8; 
    int compressedSize = encoded.size();
    double compressionRatio = (double)compressedSize / originalSize;
    cout << "\nCompression ratio: " << compressionRatio << "\n";
    return 0;
}

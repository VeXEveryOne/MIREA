#include <iostream>
#include <string>
#include <map>
#include <vector>
#include <algorithm>
#include <string>
#include <fstream>

using namespace std;

struct Symbol {
    char ch;
    int freq;
    string code;
};

bool compareFreq(const Symbol &a, const Symbol &b) {
    return a.freq > b.freq;
}

void buildCodes(vector<Symbol> &symbols, int start, int end) {
    if (start >= end) return;
    
    int totalFreq = 0;
    for (int i = start; i <= end; i++) {
        totalFreq += symbols[i].freq;
    }
    
    int halfFreq = 0, split = start;
    for (int i = start; i <= end; i++) {
        if (halfFreq + symbols[i].freq > totalFreq / 2) {
            break;
        }
        halfFreq += symbols[i].freq;
        split = i;
    }
    
    for (int i = start; i <= split; i++) {
        symbols[i].code += "0";
    }
    for (int i = split + 1; i <= end; i++) {
        symbols[i].code += "1";
    }
    
    buildCodes(symbols, start, split);
    buildCodes(symbols, split + 1, end);
}

vector<Symbol> calculateFrequencies(const string &text) {
    map<char, int> freqMap;
    for (char ch : text) {
        freqMap[ch]++;
    }
    
    vector<Symbol> symbols;
    for (auto &entry : freqMap) {
        symbols.push_back({entry.first, entry.second, ""});
    }
    sort(symbols.begin(), symbols.end(), compareFreq);
    
    return symbols;
}

string encodeText(const string &text, const vector<Symbol> &symbols) {
    map<char, string> codeMap;
    for (const Symbol &s : symbols) {
        codeMap[s.ch] = s.code;
    }
    
    string encoded;
    for (char ch : text) {
        encoded += codeMap[ch];
    }
    return encoded;
}

string decodeText(const string &encoded, const vector<Symbol> &symbols) {
    map<string, char> decodeMap;
    for (const Symbol &s : symbols) {
        decodeMap[s.code] = s.ch;
    }
    
    string decoded, temp;
    for (char bit : encoded) {
        temp += bit;
        if (decodeMap.count(temp)) {
            decoded += decodeMap[temp];
            temp.clear();
        }
    }
    return decoded;
}

int main() {
    string text = "This is a test file. It contains some repeated text to test compression algorithms. Compression is essential for efficient storage and transmission of data. Let's see how well the Shannon-Fano and Huffman algorithms perform.";

    vector<Symbol> symbols = calculateFrequencies(text);
    
    buildCodes(symbols, 0, symbols.size() - 1);
    
    cout << "Table of symbols and codes:\n";
    for (const Symbol &s : symbols) {
        cout << "Symbol: " << s.ch << ", Frequency: " << s.freq << ", Code: " << s.code << "\n";
    }
    
    string encoded = encodeText(text, symbols);
    cout << "\nEncoded text:\n" << encoded << "\n";

    
    string decoded = decodeText(encoded, symbols);
    cout << "\nDecoded text:\n" << decoded << "\n";
    
    int originalSize = text.size() * 8; 
    int compressedSize = encoded.size();
    double compressionRatio = (double)compressedSize / originalSize;
    cout << "\nCompression ratio: " << compressionRatio << "\n";
    
    return 0;
}
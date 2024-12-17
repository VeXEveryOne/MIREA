#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <Windows.h>
using namespace std;

// ������� ��� ���������� ������ �������� ����� � ���������� ������ � ��������� ������
void findLongestWord() {  
    string sentence;
    string word;
    string longestWord;
    cout << "������� �����������: ";
    getline(cin, sentence);
    istringstream iss(sentence);
    while (iss >> word) {
        // ���������, ��� ������ � ��������� ����� ��������� � ��� ��� ����� ������� �����
        if (word.front() == word.back() && word.length() > longestWord.length()) {
            longestWord = word;
        }
    }
    if (!longestWord.empty()) {
        cout << "����� ������� ����� � ���������� ������ � ��������� ������: " << longestWord << endl;
    } else {
        cout << "����� ���� ���." << endl;
    }
}

// ������� ��� ���������� ������� ���������� ���������, ������� ������������ � ��������� �����-�������-������
vector<int> computeLPSArray(const string& pattern) {
    int len = 0;
    vector<int> lps(pattern.length(), 0);
    int i = 1;

    while (i < pattern.length()) {
        if (pattern[i] == pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len != 0) {
                len = lps[len - 1];
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
    return lps;
}

// ������� ��� ������ ���������� ��������� ������� � ����� � ������� ��������� �����-�������-������
void KMPSearch() {
    string text, pattern;
    cout << "������� �����: ";
    getline(cin, text);
    cout << "������� �������: ";
    getline(cin, pattern);

    vector<int> lps = computeLPSArray(pattern);
    int i = 0; // ������ ��� ������
    int j = 0; // ������ ��� �������
    int lastIndex = -1; // ������ ���������� ��������� �������

    while (i < text.length()) {
        if (pattern[j] == text[i]) {
            i++;
            j++;
        }
        if (j == pattern.length()) {
            lastIndex = i - j; // ��������� ������ ���������� ���������
            j = lps[j - 1];
        } else if (i < text.length() && pattern[j] != text[i]) {
            if (j != 0) {
                j = lps[j - 1];
            } else {
                i++;
            }
        }
    }
    if (lastIndex != -1) {
        cout << "��������� ��������� ������� ������� �� �������: " << lastIndex << endl;
    } else {
        cout << "������� �� ������." << endl;
    }
}

int main() {
    SetConsoleCP(1251);
    SetConsoleOutputCP(1251);

    cout << "1 ������" << endl << "---------------------------------------------------------" << endl;
    findLongestWord();

    cout << "2 ������" << endl << "---------------------------------------------------------" << endl;
    KMPSearch();

    return 0;
}

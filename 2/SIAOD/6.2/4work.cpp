#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <Windows.h>
using namespace std;

// Функция для нахождения самого длинного слова с одинаковой первой и последней буквой
void findLongestWord() {  
    string sentence;
    string word;
    string longestWord;
    cout << "Введите предложение: ";
    getline(cin, sentence);
    istringstream iss(sentence);
    while (iss >> word) {
        // Проверяем, что первая и последняя буквы совпадают и что это самое длинное слово
        if (word.front() == word.back() && word.length() > longestWord.length()) {
            longestWord = word;
        }
    }
    if (!longestWord.empty()) {
        cout << "Самое длинное слово с одинаковой первой и последней буквой: " << longestWord << endl;
    } else {
        cout << "Таких слов нет." << endl;
    }
}

// Функция для построения массива наибольших префиксов, который используется в алгоритме Кнута-Морриса-Пратта
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

// Функция для поиска последнего вхождения образца в текст с помощью алгоритма Кнута-Морриса-Пратта
void KMPSearch() {
    string text, pattern;
    cout << "Введите текст: ";
    getline(cin, text);
    cout << "Введите образец: ";
    getline(cin, pattern);

    vector<int> lps = computeLPSArray(pattern);
    int i = 0; // Индекс для текста
    int j = 0; // Индекс для образца
    int lastIndex = -1; // Индекс последнего вхождения образца

    while (i < text.length()) {
        if (pattern[j] == text[i]) {
            i++;
            j++;
        }
        if (j == pattern.length()) {
            lastIndex = i - j; // Обновляем индекс последнего вхождения
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
        cout << "Последнее вхождение образца найдено на индексе: " << lastIndex << endl;
    } else {
        cout << "Образец не найден." << endl;
    }
}

int main() {
    SetConsoleCP(1251);
    SetConsoleOutputCP(1251);

    cout << "1 Задача" << endl << "---------------------------------------------------------" << endl;
    findLongestWord();

    cout << "2 Задача" << endl << "---------------------------------------------------------" << endl;
    KMPSearch();

    return 0;
}

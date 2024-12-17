#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <Windows.h>
using namespace std;
int longestPalindrome(const string& str) {
    int n = str.size();
    
    vector<vector<int>> dp(n, vector<int>(n, 0));

    for (int i = 0; i < n; ++i) dp[i][i] = 1;

    for (int len = 2; len <= n; ++len) { 
        for (int i = 0; i <= n - len; ++i) {
            int j = i + len - 1;
            if (str[i] == str[j]) dp[i][j] = dp[i + 1][j - 1] + 2;
                else dp[i][j] = max(dp[i + 1][j], dp[i][j - 1]);
        }
    }
    return dp[0][n - 1]; //результат
}

int main() {
    SetConsoleCP(1251);
    SetConsoleOutputCP(1251);
    string input;
    cout << "¬ведите строку из заглавных букв латинского алфавита: ";
    cin >> input;

    int maxPalindromeLength = longestPalindrome(input);
    cout << "ƒлина наибольшего палиндрома: " << maxPalindromeLength << endl;

    return 0;
}
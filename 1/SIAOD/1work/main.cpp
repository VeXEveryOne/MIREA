#include <iostream>
#include <stdlib.h>
#include <ctime>
#include <stdio.h>
#include <string>
using namespace std;

bool checkNum(string n){
    for (int i = 0; i < n.size(); ++i)
        if (!(n[i]>='0' && n[i]<='9')) return 0;
    return 1;
}

void zapol(int*x, int N){
    if (N == 10) {
        cout << endl << "�������� ����������� ������ �� 10 ��������: " << endl;
        for (int i = 0; i < N; ++i) {
            x[i] = rand() % 10;
            cout << x[i] << " ";
        }
        cout << endl;
    } else {
        cout << "�������� ����������� ������ �� 100 ��������: " << endl;
        for (int i = 0; i < N; i++) {
            x[i] = rand() % 10;
            cout << x[i] << " ";
        }
        cout << endl;
    }
}

void delFirstMethod(int* v, int* x, int n, int key) {
    int i = 0, cnt = 0;
    while (i < n) {
        cnt++;
        if (x[i] == key) {
            cnt++;
            for (int j = i; j < n - 1; ++j) {
                x[j] = x[j + 1];
                cnt += 2;
            }
            n--;
        } else {
            i++;
            cnt++;
        }
    }

    v[0] = cnt;
    v[1] = n;
}

void delSecondMethod(int* v, int* x, int n, int key){
    int j = 0, cnt = 0;
    for (int i = 0; i < n; ++i) {
        x[j] = x[i];
        if (x[i]!=key) j++;
        cnt+=3;
    }
    n = j;
    v[0] = cnt;
    v[1] = n;
}

void vivod(int* v, int* x){
    if(v[1]==0) cout << "��������� �������� �� �������.." << endl;
    else{
        cout << "������������ ������: " << endl;
        for (int i = 0; i < v[1]; ++i) {
            cout << x[i] << " ";
        }
        cout << endl;
    }
}

int main() {
    srand(time(NULL));
    setlocale(LC_ALL, "Russian");

    int v [2] {0,0};
    string var;
    cout << "�������� ������� ���������� �������(1 - ������ ����������, 0 - ��������� ����������): ";
    cin >> var;
    cout << endl;
    while (!(checkNum(var)) || (var != "1" && var != "0") ) {
        cout << "������� ������������ ��������, ���������� ��� ���: ";
        cin >> var;
        cout << endl;
    }
    int VAR = stoi(var);

    string n;
    cout << "�������� ������ �������(10/100): ";
    cin >> n;
    while (!(checkNum(n)) || (n != "10" && n != "100") ) {
        cout << "������� ������������ ��������, ���������� ��� ���: ";
        cin >> n;
    }
    int N = stoi(n);

    int* x = new int [N];
    if (VAR==1){
        string el;
        for (int i = 0; i < N; ++i) {
            cout << endl << i+1 << "������� ������� �������: ";
            cin >> el;
            while (!(checkNum(el))) {
                cout << "������� ������������ ��������, ���������� ��� ���: " << endl;
                cin >> el;
            }
            x[i] = stoi(el);
        }
        cout << endl << "������������ ������: ";
        for (int i = 0; i < N; i++) {
            cout << x[i] << " ";
        }
        cout << endl;
    } else zapol(x, N);

    string key;
    cout << endl << "������� ��������, ������� ������ �������: ";
    cin >> key;
    while (!(checkNum(n))|| key.size() != 1) {
        cout << "������� ������������ ��������, ���������� ��� ���: " << endl;
        cin >> key;
    }
    int KEY = stoi(key);

    int counter = 0;
    for (int i = 0; i < N; ++i) {
        if (x[i] == KEY){
            counter++;
        }
    }

    string alg;
    cout << endl << "�������� ������� ��������(1 - ������ �������; 2 - ������ �������): ";
    cin >> alg;
    cout << endl;
    while (!(checkNum(alg)) || (alg != "1" && alg != "2") ) {
        cout << "������� ������������ ��������, ���������� ��� ���: " << endl;
        cin >> alg;
    }
    int ALG = stoi(alg);


    if (ALG==1){
        delFirstMethod(v, x, N, KEY);
        vivod(v, x);
        cout << endl << " 1: " << v[0] << endl;
    }
    else{
        delSecondMethod(v, x, N, KEY);
        vivod(v, x);
        cout << endl << " 2: " << v[0] << endl;
    }
    cout << endl << "--------------------------------------------------------------------------------------" << endl << endl;
    delete[] x;
    main();
}


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
        cout << endl << "Рандомно заполненный массив из 10 значений: " << endl;
        for (int i = 0; i < N; ++i) {
            x[i] = rand() % 10;
            cout << x[i] << " ";
        }
        cout << endl;
    } else {
        cout << "Рандомно заполненный массив из 100 значений: " << endl;
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
    if(v[1]==0) cout << "Введенное значение не найдено.." << endl;
    else{
        cout << "Получившийся массив: " << endl;
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
    cout << "Выберите вариант заполнения массива(1 - ручное заполнение, 0 - рандомное заполнение): ";
    cin >> var;
    cout << endl;
    while (!(checkNum(var)) || (var != "1" && var != "0") ) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> var;
        cout << endl;
    }
    int VAR = stoi(var);

    string n;
    cout << "Выберите размер массива(10/100): ";
    cin >> n;
    while (!(checkNum(n)) || (n != "10" && n != "100") ) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> n;
    }
    int N = stoi(n);

    int* x = new int [N];
    if (VAR==1){
        string el;
        for (int i = 0; i < N; ++i) {
            cout << endl << i+1 << "Введите элемент массива: ";
            cin >> el;
            while (!(checkNum(el))) {
                cout << "Введено некорректное значение, попробуйте еще раз: " << endl;
                cin >> el;
            }
            x[i] = stoi(el);
        }
        cout << endl << "Получившийся массив: ";
        for (int i = 0; i < N; i++) {
            cout << x[i] << " ";
        }
        cout << endl;
    } else zapol(x, N);

    string key;
    cout << endl << "Введите значение, которое хотите удалить: ";
    cin >> key;
    while (!(checkNum(n))|| key.size() != 1) {
        cout << "Введено некорректное значение, попробуйте еще раз: " << endl;
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
    cout << endl << "Выберите вариант удаления(1 - первый вариант; 2 - второй вариант): ";
    cin >> alg;
    cout << endl;
    while (!(checkNum(alg)) || (alg != "1" && alg != "2") ) {
        cout << "Введено некорректное значение, попробуйте еще раз: " << endl;
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


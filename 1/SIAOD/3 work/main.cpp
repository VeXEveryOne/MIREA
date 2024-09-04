#include <iostream>
#include <functional>
#include <time.h>
#include <chrono>
#include <random>
#include <cstdlib>
using namespace std;

bool checkNum (string n){
    for (int i = 0; i < n.size(); ++i) {
        if (!(n[i]>='0' and n[i]<='9'))
            return 0;
    }
    return 1;
}

void shekerSort(int* mass, int count)
{
    int left = 0, right = count - 1;
    int flag = 1;  // флаг наличия перемещений
    while ((left < right) && flag > 0)
    {
        flag = 0;
        for (int i = left; i < right; i++)  //двигаемся слева направо
        {
            if (mass[i] < mass[i+1]) // если следующий элемент меньше текущего,
            {             // меняем их местами
                double t = mass[i];
                mass[i] = mass[i+1];
                mass[i+1] = t;
                flag = 1;      // перемещения в этом цикле были
            }
        }
        right--; // сдвигаем правую границу на предыдущий элемент
        for (int i = right; i > left; i--)  //двигаемся справа налево
        {
            if (mass[i-1] < mass[i]) // если предыдущий элемент больше текущего,
            {            // меняем их местами
                double t = mass[i];
                mass[i] = mass[i-1];
                mass[i-1] = t;
                flag = 1;    // перемещения в этом цикле были
            }
        }
        left++; // сдвигаем левую границу на следующий элемент
        if(flag == 0) break;
    }
}
void directMergeSort(int* a, int fsize) {
    if (fsize < 2)return;
    directMergeSort(a, fsize / 2);
    directMergeSort(&a[fsize / 2], fsize - (fsize / 2));
    int* buf = new int[fsize];
    int idbuf = 0, idl = 0, idr = fsize / 2;
    while ((idl < fsize / 2) && (idr < fsize)){
        if (a[idl] > a[idr])
            buf[idbuf++] = a[idl++];
        else
            buf[idbuf++] = a[idr++];
    }
    while (idl < fsize / 2) buf[idbuf++] = a[idl++];
    while (idr < fsize) buf[idbuf++] = a[idr++];
    for (idl = 0; idl < fsize; idl++)a[idl] = buf[idl];
    delete[]buf;
}

int CheckInput (string n){
    while (!(checkNum(n))) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}

int  CheckInputvar (string n){
    while (!(checkNum(n)) and (n == "1" or n == "2" or n == "3")) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}

void RandomArray(int* x, int n){
    for (int i = 0; i < n; ++i) {
        x[i] = rand() % 10;
    }
}

void vivod(int* x, int n){
    for (int i = 0; i < n; ++i) {
        cout << x[i] << " ";
    }
    cout << endl;
}

int main() {
    srand(time(NULL));
    setlocale(LC_ALL, "Russian");

    string N;
    cout << "Введите размер массива" << endl;
    cin >> N;
    int n = CheckInput(N);

    string VAR;
    cout << "Выберите вариант заполнения массива" << endl << "1 - рандомно" << endl << "2 - возрастающий" << endl << "3 - убывающий" << endl;
    cin >> VAR;
    int var = CheckInput(VAR);

    int* x = new int[n];

    if (var == 1) {
        RandomArray(x, n);
        cout << "Рандомный массив из " << n << " чисел" << endl;
        vivod(x, n);
    }
    else if (var == 2){
        for (int i = 0; i < n; ++i) {
            x[i] = i;
        }
        cout << "Возрастающий массив из " << n << " чисел" << endl;
        vivod(x, n);
    }
    else{
        for (int i = 0; i < n; ++i) {
            x[i] = n - i;
        }
        cout << "Убывающий массив из " << n << " чисел" << endl;
        vivod(x, n);
    }

    string VARS;
    cout << "Выберите вариант сортировки" << endl << "1 - шейкерная сортировка" << endl << "2 - простое слияние" << endl;
    cin >> VARS;
    int vars = CheckInputvar(VARS);

    if (vars==1){
        cout << "Шейкерная сортировка" << endl;
        auto begin = chrono::steady_clock::now();
        shekerSort(x, n);
        auto end = chrono::steady_clock::now();
        auto elapsed_ms = chrono::duration_cast<chrono::milliseconds>(end - begin);
        vivod(x, n);
        cout << "The time: " << elapsed_ms.count() << " ms\n";
        cout << "-------------------------------------------------------------------------------------------------------" << endl;

    }
    else{
        cout << "Простое слияние" << endl;
        auto begin = chrono::steady_clock::now();
        directMergeSort(x, n);
        auto end = chrono::steady_clock::now();
        auto elapsed_ms = chrono::duration_cast<chrono::milliseconds>(end - begin);
        vivod(x, n);
        cout << "-------------------------------------------------------------------------------------------------------" << endl;

    }
    main();
}

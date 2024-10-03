#include <iostream>
#include <bitset>
#include <fstream>
#include <string>
#include <vector>
#include <algorithm> 
#include <chrono>
#include <windows.h>
#include <psapi.h>  
using namespace std;


void Task11() {
    cout << "Упражение 1: установить 1 в четные биты" << endl;
    unsigned short int var1 = 0x8C;//140 в 10сс 0000000010001100 в 2сс
    cout << "Число в 10 СС: " << var1 << endl;
    cout << "Число в 2 СС: " << bitset<16>(var1) << endl;
    unsigned short int mask = 0x5555;//21845 в 10сс 0101010101010101 в 2сс    
    cout << "Маска (2 cc): " << bitset<16>(mask)  << endl;
    unsigned short int res = var1|mask;
    cout << "Результат (2 СС): " << bitset<16>(res) << endl;
    cout << "Результат (10 СС): " << (res) << endl;
    cout << "--------------------------------------------------" << endl;
}

void Task12() {
    cout << "Упражнение 2: обнулить 7, 9 и 11 биты" << endl << "Введите число в 10 системе сисления: ";
    int var2;
    cin >> var2;
    unsigned short int mask = ~((1 << 7) | (1 << 9) | (1 << 11));//62847 в 10cc 1111010101111111 в бинарной
    int res = var2&mask;
    cout << "Пол.Число (2 СС): " << bitset<16>(var2) << endl;
    cout << "Результат (2 СС): " << bitset<16>(res) << endl;
    cout << "Результат (10 СС): " << res << endl;
    cout << "-----------------------------------------------------" << endl;
}

void Task13() {
    int var3;
    cout << "Упражнение 3: порязрядно умножить на 16" << endl << "Введите число в 10 системе сисления: ";
    cin >> var3;
    cout << "Введенное число в 2 СС: " << bitset<16>(var3) << endl;
    unsigned short int res = var3 << 4;
    cout << "Результат (2 СС): " << bitset<16>(res) << endl;
    cout << "Результат (10 СС): " << res << endl;
    cout << "-----------------------------------------------------" << endl;
}

void Task14() {
    cout << "Упражнение 4: порязрядно поделить на 16" << endl << "Введите число в 10 системе сисления: ";
    int var4;
    cin >> var4;
    cout << "Введенное число в 2 СС: " << bitset<16>(var4) << endl;
    unsigned short int res = var4 >> 4;
    cout << "Результат (2 СС): " << bitset<16>(res) << endl;
    cout << "Результат (10 СС): " << res << endl;
    cout << "-----------------------------------------------------" << endl;
}

void Task15() {
    cout << "Упражнение 5: обнулить n-ый бит по маске <0000000000000001>" << endl << "Введите число в 10 системе сисления: ";
    int n;
    unsigned short int var5;
    cin >> var5;
    cout << "Введенное число в 2 СС: " << bitset<16>(var5) << endl;
    cout << "Введите номер разряда, который вы хотите обнулить(начиная с 0): ";
    cin >> n;

    unsigned short int mask = 1 << n;
    cout << "Получившаяся маска в 2 СС: " << bitset<16>(mask) << endl;
    unsigned short int res = var5^mask;
    cout << "Результат (2 СС): " << bitset<16>(res) << endl;
    cout << "Результат (10 СС): " << res << endl;
    cout << "--------------------------------------------------" << endl;
}
bool checkNum (string n){
    for (int i = 0; i < n.size(); ++i) {
        if (!(n[i]>='0' and n[i]<='9'))
            return 0;
    }
    return 1;
}
int CheckInput (string n){
    while (!(checkNum(n) & (stoi(n) >= 0 & stoi(n) <= 7))) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}
int CheckInput1 (string n){
    while (!(checkNum(n) & (stoi(n) >= 2 & stoi(n) <= 100))) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}

int Task2a(){
    unsigned char bitArray = 0; // Создаём переменную для битовой маски (8 бит)
    string n;

    cout << "Упражнение 1: отсортировать массив, с помощью бинатного массива наличия" << endl << "Введите количество элементов в массиве(от 2 до 8): ";    
    cin >> n;
    int N = CheckInput1(n);

    cout << "Введите массив из " << N << " элементов(цифры от 0 до 7): ";
    for (int i = N; i > 0; --i) {
        string check;
        cin >> check;
        int num = CheckInput(check);
        bitArray |= (1 << num); // Устанавливаем бит в позицию, соответствующую введённому числу
    }
    cout << "Битовая последовательность: " << bitset<8>(bitArray) << endl;

    // Проходим по битам и выводим индексы, где биты установлены в 1 (это и есть числа исходного набора)
    cout << "Отсортированный набор чисел: {";
    for (int i = 0, count = 0; i < 8; ++i) {
        if (bitArray & (1 << i)) {
            if (count > 0) {  // Добавляем запятую, если это не первое число
            cout << ", ";
            }
            cout << i;
            ++count;  // Увеличиваем счётчик, чтобы отслеживать количество выведенных чисел
        }
    }
    cout << "}" << endl << "----------------------------------------------------------" << endl;
}

int CheckInput2 (string n){
    while (!(checkNum(n) & (stoi(n) >= 0 & stoi(n) <= 100))) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}


void Task2b(){
    const int SIZE = 25; // Размер массива для 64 бит (8 байтов)
    unsigned char bitArray[SIZE] = { 0 }; // Массив для хранения битов
    string n; cout << "Упражнение 2: усовершенствовать работу алгоритма из 1 упражнения" << endl << "Введите количество элементов в массиве(от 2 до 8): "; cin >> n;
    int N = CheckInput1(n);
    
    cout << "Введите " << N << " числа от 0 до 63:" << endl;
    for (int i = 0; i < N; ++i) {
        string checkNum;
        cin >> checkNum;
        int num = CheckInput2(checkNum);

        // Определяем индекс в массиве и позицию бита
        int index = num / 8; // Позиция байта
        int bitPos = num % 8; // Позиция бита внутри байта

        // Устанавливаем бит в позицию, соответствующую введённому числу
        bitArray[index] |= (1 << bitPos);
    }

    // Вывод битовой последовательности
    cout << "Битовая последовательность: ";
    for (int i = 0; i < SIZE; ++i) {
        cout << bitset<8>(bitArray[i]) << " ";
    }

    // Проходим по битам и выводим индексы, где биты установлены в 1 (это и есть числа исходного набора)
    cout << endl << "Отсортированный набор чисел: {";
    bool first = true; // Флаг для управления форматированием вывода

    for (int i = 0; i < SIZE; ++i) {
        for (int j = 0; j < 8; ++j) {
            if (bitArray[i] & (1 << j)) {
                if (!first) {  // Добавляем запятую, если это не первое число
                    cout << ", ";
                }
                cout << (i * 8 + j);
                first = false; // После первого числа убираем флаг
            }
        }
    }
    cout << "}";
}

// Функция для получения текущего объема использованной оперативной памяти (в байтах)
long getMemoryUsage() {
    PROCESS_MEMORY_COUNTERS memInfo;
    GetProcessMemoryInfo(GetCurrentProcess(), &memInfo, sizeof(memInfo));
    return memInfo.PeakWorkingSetSize / 1024; // Возвращает максимальный объем памяти в килобайтах

}
const int MAX_NUM = 10000000;

void boss(const string &inputFilename, const string &outputFilename) {
    bitset<MAX_NUM> bitArray;

    ifstream in(inputFilename);
    if (!in) {
        cerr << "Ошибка открытия файла для чтения!" << endl;
        return;
    }

    int number;
    while (in >> number) {
        if (number >= 0 && number < MAX_NUM) {
            bitArray.set(number);
        }
    }
    in.close();

    ofstream out(outputFilename);
    if (!out) {
        cerr << "Ошибка открытия файла для записи!" << endl;
        return;
    }

    for (int i = 0; i < MAX_NUM; ++i) {
        if (bitArray.test(i)) {
            out << i << "\n";
        }
    }
    out.close();
}

int start(){
    string inputFilename, outputFilename;
    cout << "Введите название файла с числами: ";
    cin >> inputFilename;
    cout << "Введите название файла куда будем сохранять отсортированное: ";
    cin >> outputFilename;

    long memoryBefore = getMemoryUsage();

    auto start = chrono::high_resolution_clock::now();

    // Вызов функции для обработки чисел
    boss(inputFilename, outputFilename);

    // Измерение времени окончания выполнения программы
    auto end = chrono::high_resolution_clock::now();

    // Вычисление затраченного времени
    chrono::duration<double> duration = end - start;

    // Измерение объема памяти после выполнения программы
    long memoryAfter = getMemoryUsage();

    // Вывод времени выполнения и памяти
    cout << "Затраченное время: " << duration.count() << " секунд" << endl;
    cout << "Использованная память: " << (memoryAfter - memoryBefore) << " KB" << endl;

    return 0;
}

int main() {
    setlocale(LC_ALL, "RUS");
    // cout << "Задание 1" << endl << "-----------------------------------------------------" << endl;
    // Task11();
    // Task12(); //65535
    // Task13(); //33
    // Task14(); //1024
    // Task15(); //
    // cout << "Задание 2" << endl << "--------------------------------------------------------------" << endl;
    // Task2a();
    Task2b();
    // cout << endl << "Задание 3" << endl << "--------------------------------------------------------------" << endl;
    // start();
}
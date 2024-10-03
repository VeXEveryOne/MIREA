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
    cout << "��������� 1: ���������� 1 � ������ ����" << endl;
    unsigned short int var1 = 0x8C;//140 � 10�� 0000000010001100 � 2��
    cout << "����� � 10 ��: " << var1 << endl;
    cout << "����� � 2 ��: " << bitset<16>(var1) << endl;
    unsigned short int mask = 0x5555;//21845 � 10�� 0101010101010101 � 2��    
    cout << "����� (2 cc): " << bitset<16>(mask)  << endl;
    unsigned short int res = var1|mask;
    cout << "��������� (2 ��): " << bitset<16>(res) << endl;
    cout << "��������� (10 ��): " << (res) << endl;
    cout << "--------------------------------------------------" << endl;
}

void Task12() {
    cout << "���������� 2: �������� 7, 9 � 11 ����" << endl << "������� ����� � 10 ������� ��������: ";
    int var2;
    cin >> var2;
    unsigned short int mask = ~((1 << 7) | (1 << 9) | (1 << 11));//62847 � 10cc 1111010101111111 � ��������
    int res = var2&mask;
    cout << "���.����� (2 ��): " << bitset<16>(var2) << endl;
    cout << "��������� (2 ��): " << bitset<16>(res) << endl;
    cout << "��������� (10 ��): " << res << endl;
    cout << "-----------------------------------------------------" << endl;
}

void Task13() {
    int var3;
    cout << "���������� 3: ���������� �������� �� 16" << endl << "������� ����� � 10 ������� ��������: ";
    cin >> var3;
    cout << "��������� ����� � 2 ��: " << bitset<16>(var3) << endl;
    unsigned short int res = var3 << 4;
    cout << "��������� (2 ��): " << bitset<16>(res) << endl;
    cout << "��������� (10 ��): " << res << endl;
    cout << "-----------------------------------------------------" << endl;
}

void Task14() {
    cout << "���������� 4: ���������� �������� �� 16" << endl << "������� ����� � 10 ������� ��������: ";
    int var4;
    cin >> var4;
    cout << "��������� ����� � 2 ��: " << bitset<16>(var4) << endl;
    unsigned short int res = var4 >> 4;
    cout << "��������� (2 ��): " << bitset<16>(res) << endl;
    cout << "��������� (10 ��): " << res << endl;
    cout << "-----------------------------------------------------" << endl;
}

void Task15() {
    cout << "���������� 5: �������� n-�� ��� �� ����� <0000000000000001>" << endl << "������� ����� � 10 ������� ��������: ";
    int n;
    unsigned short int var5;
    cin >> var5;
    cout << "��������� ����� � 2 ��: " << bitset<16>(var5) << endl;
    cout << "������� ����� �������, ������� �� ������ ��������(������� � 0): ";
    cin >> n;

    unsigned short int mask = 1 << n;
    cout << "������������ ����� � 2 ��: " << bitset<16>(mask) << endl;
    unsigned short int res = var5^mask;
    cout << "��������� (2 ��): " << bitset<16>(res) << endl;
    cout << "��������� (10 ��): " << res << endl;
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
        cout << "������� ������������ ��������, ���������� ��� ���: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}
int CheckInput1 (string n){
    while (!(checkNum(n) & (stoi(n) >= 2 & stoi(n) <= 100))) {
        cout << "������� ������������ ��������, ���������� ��� ���: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}

int Task2a(){
    unsigned char bitArray = 0; // ������ ���������� ��� ������� ����� (8 ���)
    string n;

    cout << "���������� 1: ������������� ������, � ������� ��������� ������� �������" << endl << "������� ���������� ��������� � �������(�� 2 �� 8): ";    
    cin >> n;
    int N = CheckInput1(n);

    cout << "������� ������ �� " << N << " ���������(����� �� 0 �� 7): ";
    for (int i = N; i > 0; --i) {
        string check;
        cin >> check;
        int num = CheckInput(check);
        bitArray |= (1 << num); // ������������� ��� � �������, ��������������� ��������� �����
    }
    cout << "������� ������������������: " << bitset<8>(bitArray) << endl;

    // �������� �� ����� � ������� �������, ��� ���� ����������� � 1 (��� � ���� ����� ��������� ������)
    cout << "��������������� ����� �����: {";
    for (int i = 0, count = 0; i < 8; ++i) {
        if (bitArray & (1 << i)) {
            if (count > 0) {  // ��������� �������, ���� ��� �� ������ �����
            cout << ", ";
            }
            cout << i;
            ++count;  // ����������� �������, ����� ����������� ���������� ���������� �����
        }
    }
    cout << "}" << endl << "----------------------------------------------------------" << endl;
}

int CheckInput2 (string n){
    while (!(checkNum(n) & (stoi(n) >= 0 & stoi(n) <= 100))) {
        cout << "������� ������������ ��������, ���������� ��� ���: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}


void Task2b(){
    const int SIZE = 25; // ������ ������� ��� 64 ��� (8 ������)
    unsigned char bitArray[SIZE] = { 0 }; // ������ ��� �������� �����
    string n; cout << "���������� 2: ����������������� ������ ��������� �� 1 ����������" << endl << "������� ���������� ��������� � �������(�� 2 �� 8): "; cin >> n;
    int N = CheckInput1(n);
    
    cout << "������� " << N << " ����� �� 0 �� 63:" << endl;
    for (int i = 0; i < N; ++i) {
        string checkNum;
        cin >> checkNum;
        int num = CheckInput2(checkNum);

        // ���������� ������ � ������� � ������� ����
        int index = num / 8; // ������� �����
        int bitPos = num % 8; // ������� ���� ������ �����

        // ������������� ��� � �������, ��������������� ��������� �����
        bitArray[index] |= (1 << bitPos);
    }

    // ����� ������� ������������������
    cout << "������� ������������������: ";
    for (int i = 0; i < SIZE; ++i) {
        cout << bitset<8>(bitArray[i]) << " ";
    }

    // �������� �� ����� � ������� �������, ��� ���� ����������� � 1 (��� � ���� ����� ��������� ������)
    cout << endl << "��������������� ����� �����: {";
    bool first = true; // ���� ��� ���������� ��������������� ������

    for (int i = 0; i < SIZE; ++i) {
        for (int j = 0; j < 8; ++j) {
            if (bitArray[i] & (1 << j)) {
                if (!first) {  // ��������� �������, ���� ��� �� ������ �����
                    cout << ", ";
                }
                cout << (i * 8 + j);
                first = false; // ����� ������� ����� ������� ����
            }
        }
    }
    cout << "}";
}

// ������� ��� ��������� �������� ������ �������������� ����������� ������ (� ������)
long getMemoryUsage() {
    PROCESS_MEMORY_COUNTERS memInfo;
    GetProcessMemoryInfo(GetCurrentProcess(), &memInfo, sizeof(memInfo));
    return memInfo.PeakWorkingSetSize / 1024; // ���������� ������������ ����� ������ � ����������

}
const int MAX_NUM = 10000000;

void boss(const string &inputFilename, const string &outputFilename) {
    bitset<MAX_NUM> bitArray;

    ifstream in(inputFilename);
    if (!in) {
        cerr << "������ �������� ����� ��� ������!" << endl;
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
        cerr << "������ �������� ����� ��� ������!" << endl;
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
    cout << "������� �������� ����� � �������: ";
    cin >> inputFilename;
    cout << "������� �������� ����� ���� ����� ��������� ���������������: ";
    cin >> outputFilename;

    long memoryBefore = getMemoryUsage();

    auto start = chrono::high_resolution_clock::now();

    // ����� ������� ��� ��������� �����
    boss(inputFilename, outputFilename);

    // ��������� ������� ��������� ���������� ���������
    auto end = chrono::high_resolution_clock::now();

    // ���������� ������������ �������
    chrono::duration<double> duration = end - start;

    // ��������� ������ ������ ����� ���������� ���������
    long memoryAfter = getMemoryUsage();

    // ����� ������� ���������� � ������
    cout << "����������� �����: " << duration.count() << " ������" << endl;
    cout << "�������������� ������: " << (memoryAfter - memoryBefore) << " KB" << endl;

    return 0;
}

int main() {
    setlocale(LC_ALL, "RUS");
    // cout << "������� 1" << endl << "-----------------------------------------------------" << endl;
    // Task11();
    // Task12(); //65535
    // Task13(); //33
    // Task14(); //1024
    // Task15(); //
    // cout << "������� 2" << endl << "--------------------------------------------------------------" << endl;
    // Task2a();
    Task2b();
    // cout << endl << "������� 3" << endl << "--------------------------------------------------------------" << endl;
    // start();
}
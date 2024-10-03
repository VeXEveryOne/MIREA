#include <iostream>
#include <string>
#include <fstream>
#include <vector>
#include <chrono>
#include <algorithm> 
#include <cmath> 

using namespace std;


struct stroki {
private:
    string phone_;              // �����
    string adress_;             // �����
    int final_position;         // ������� ������� � ����� (������)
public:
    stroki() : phone_(""), adress_(""), final_position(0) {}

    stroki(string phone, string adress, int this_) : phone_(phone), adress_(adress), final_position(this_) {}

    // ������� � ������������ ���������������
    string get_phone() const { return phone_; }
    string get_adress() const { return adress_; }
    int get_final_position() const { return final_position; }

    void print() const {
        cout << "Phone: " << phone_ << ", Address: " << adress_ << ", Position: " << final_position << endl;
    }
};

bool checkNum (string n){
    for (int i = 0; i < n.size(); ++i) {
        if (!(n[i]>='0' and n[i]<='9'))
            return 0;
    }
    return 1;
}
int CheckInput (string n){
    while (!(checkNum(n))) {
        cout << "������� ������������ ��������, ���������� ��� ���: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}
string CheckInput1 (string n){
    while (!(checkNum(n) | n[0] == '8' | n[1] == '9' | n[1] == '1' | size(n) == 11)) {
        cout << "������� ������������ ��������, ���������� ��� ���: ";
        cin >> n;
    }
    return n;
}

void inputToFile(string inputFileName, int count){
    string checkCount;
    string number;
    string streat;
    int indexOfStreat;
    int indexOfNumber;
    vector<string> streats = {"����� ���������� ", "�������������� ��������", "����� ���������", "��������������� ������", "����� ����������", "����� ��������", "����� ������", "����� �������", "����� ���������", "����� ���������", "����� �����������", "����� ������"};
    
    vector<string> numbers;
    for (int i=0; i<count; i++){
        numbers.push_back(to_string(i+100000000));
    }
    auto iter = numbers.cbegin(); // ��������� �� ������ �������   
    ofstream out;
    int tmpCount = count;
    out.open(inputFileName);
    for (size_t i = 0; i < count; i++)
    {
        indexOfNumber = (rand() % (tmpCount));
        number = numbers[indexOfNumber];
        numbers.erase(iter+indexOfNumber);
        tmpCount--;

        indexOfStreat = (rand() % (size(streats)));
        streat = streats[indexOfStreat];
        out << "89" << number << " " << streat << endl;
    }
    out.close(); 
    cout << "������ ������ �������!" << endl;
}


void findNumber(string fileName, string key, int n) {
    int lineNumber = 1;
    string tmp = "891";
    string line;
    ifstream fout;
    string adres;
    fout.open(fileName);
    if (fout.is_open()){
        while(getline(fout, line)) {
            for (int i = 3; i < 11; i++){
                if (key[i] == line[i]) tmp +=key[i];
                else{ break; }     
            }
            if (key == tmp){
                adres = line.substr(12, size(line));
                cout << "����� ������ � ������ ��� �������: " << lineNumber <<  "; �����: " << adres;
            }  
            tmp = "891";
            lineNumber++;
        }
    fout.close();
    }
    else {
        cerr << "�� ������� ������� ���� " << fileName << endl;
    }
}


void get_stroki(int count, vector<stroki>& Stroki) {
    ifstream File("PhoneNumbers.bin", ios::binary);
    int cnt_search = 1;
    string adress_ = "";
    if (File.is_open()) {
        string get_;
        while (getline(File, get_)) {
            string tmp = "891";
            string phone_ = get_.substr(3, 8); //�������� ����� ��������
            adress_ = get_.substr(12); // �������� ����� (��������� ����� ������)

            if (cnt_search < count) {
                stroki obj(tmp + phone_, adress_, cnt_search); // ������� ������
                Stroki[cnt_search - 1] = obj; // ������ ������ � ������ (������, ��� ���������� ���������� � 0)
            } else {
                break;
            }
            cnt_search++;
        }
    }
    File.close();
}

// int binarySearch(const vector<stroki>& Stroki, const string& phone) {
//     int left = 0;
//     int right = Stroki.size() - 1;

//     while (left <= right) {
//         int middle = left + (right - left) / 2;

//         if (Stroki[middle].get_phone() == phone) {
//             return middle;  // ����� ������, ���������� ������
//         }

//         if (Stroki[middle].get_phone() < phone) {
//             left = middle + 1;  // ���� � ������ ��������
//         } else {
//             right = middle - 1;  // ���� � ����� ��������
//         }
//     }

//     return -1;  // ����� �� ������
// }

int binary_search_with_delta(const vector<stroki>& arr, string target) {
    int n = arr.size();

    // ���������� ������� �������� (����� ��������������)
    vector<int> delta(32);
    for (int i = 1; i < 32; ++i) {
        delta[i] = (n + static_cast<int>(pow(2, i - 1))) / static_cast<int>(pow(2, i));
    }
    cout << "������� �� �������� delta" << endl;
    for (size_t i = 1; i < 32; i++)
    {
        cout << delta[i] << " ";
    }
    cout << endl;
    int i = delta[1];
    int j = 2;

    while (true) {
        if (target < arr[i].get_phone()) { // ������� ������
            if (delta[j] == 0) {
                return -1; // ������� �� ������
            }
            i = i - delta[j];
            j++;
        } else if (target > arr[i].get_phone()) { // ������� ������
            if (delta[j] == 0) {
                return -1; // ������� �� ������
            }
            i = i + delta[j];
            j++;
        } else {
            return i; // ������� ������
        }
    }
}


int main() {
    setlocale(LC_ALL, "RUS");
    srand(time(0));
    string inputFileName = "PhoneNumbers.bin";
    string checkPhone;
    ofstream fout;
    string checkCount;
    if (!fout) {
        cerr << "������ �������� ����� ��� ������!" << endl;
        return -1;
    }

    cout << endl << "������� �1" << endl << "--------------------------------------------" << endl;
    cout << "������� ������ ��� ���������� ������� � �����: ";
    cin >> checkCount;
    int count = CheckInput(checkCount);
    inputToFile(inputFileName, count);
 

    cout << endl << "������� �2" << endl << "--------------------------------------------" << endl;
    string phone;
    cout << "������� ����� ��������, ������� ������ �����(����� ������: 891********): ";
    cin >> checkPhone;
    phone = CheckInput1(checkPhone);
    auto start = chrono::high_resolution_clock::now();
    findNumber(inputFileName, phone, count);
    auto end = chrono::high_resolution_clock::now();
    chrono::duration<double> duration = end - start;
    cout << endl << "����������� �����: " << duration.count() << " ������" << endl;


    
    cout << endl << "������� �3" << endl << "--------------------------------------------" << endl;

    vector<stroki> Stroki(count, stroki{"", "", 0}); // ������������� � ������� ����������
    get_stroki(count, Stroki);
    sort(Stroki.begin(), Stroki.end(), [](const stroki& a, const stroki& b) {
        return a.get_phone() < b.get_phone();
    });
    auto start1 = chrono::high_resolution_clock::now();


    // ��������� �������� �����
    int result = binary_search_with_delta(Stroki, phone);
    auto end1 = chrono::high_resolution_clock::now();

    if (result != -1 && result < Stroki.size()) {
        // ���� ����� ������ � ������ ���������, ������� ��� ������
        cout << "����� ������ � ������ ��� �������: " << Stroki[result].get_final_position() << "; �����: " << Stroki[result].get_adress() << endl;
    } else {
        // ���� ����� �� ������ ��� ������ ��������
        cout << "����� �������� �� ������" << endl;
    }



    chrono::duration<double> duratio = end1 - start1;
    cout << "����������� �����: " << duratio.count() << " ������" << endl;
    main();
}
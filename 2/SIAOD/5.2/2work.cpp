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
    string phone_;              // номер
    string adress_;             // адрес
    int final_position;         // позиция курсора в файле (строка)
public:
    stroki() : phone_(""), adress_(""), final_position(0) {}

    stroki(string phone, string adress, int this_) : phone_(phone), adress_(adress), final_position(this_) {}

    // геттеры с константными квалификаторами
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
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}
string CheckInput1 (string n){
    while (!(checkNum(n) | n[0] == '8' | n[1] == '9' | n[1] == '1' | size(n) == 11)) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
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
    vector<string> streats = {"улица Бабаевская ", "Бабьегородский переулок", "улица Багратион", "Багратионовский проезд", "улица Багрицкого", "улица Баженова", "улица Бажова", "улица Базовая", "улица Базовская", "улица Байдукова", "улица Байкальская", "улица Балчуг"};
    
    vector<string> numbers;
    for (int i=0; i<count; i++){
        numbers.push_back(to_string(i+100000000));
    }
    auto iter = numbers.cbegin(); // указатель на первый элемент   
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
    cout << "Запись прошла успешно!" << endl;
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
                cout << "Номер найден в строке под номером: " << lineNumber <<  "; адрес: " << adres;
            }  
            tmp = "891";
            lineNumber++;
        }
    fout.close();
    }
    else {
        cerr << "Не удалось открыть файл " << fileName << endl;
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
            string phone_ = get_.substr(3, 8); //забираем номер телефона
            adress_ = get_.substr(12); // получаем адрес (остальную часть строки)

            if (cnt_search < count) {
                stroki obj(tmp + phone_, adress_, cnt_search); // создаем объект
                Stroki[cnt_search - 1] = obj; // кладем объект в вектор (учтите, что индексация начинается с 0)
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
//             return middle;  // Номер найден, возвращаем индекс
//         }

//         if (Stroki[middle].get_phone() < phone) {
//             left = middle + 1;  // Ищем в правой половине
//         } else {
//             right = middle - 1;  // Ищем в левой половине
//         }
//     }

//     return -1;  // Номер не найден
// }

int binary_search_with_delta(const vector<stroki>& arr, string target) {
    int n = arr.size();

    // Вычисление таблицы смещений (можно оптимизировать)
    vector<int> delta(32);
    for (int i = 1; i < 32; ++i) {
        delta[i] = (n + static_cast<int>(pow(2, i - 1))) / static_cast<int>(pow(2, i));
    }
    cout << "Таблица из значений delta" << endl;
    for (size_t i = 1; i < 32; i++)
    {
        cout << delta[i] << " ";
    }
    cout << endl;
    int i = delta[1];
    int j = 2;

    while (true) {
        if (target < arr[i].get_phone()) { // Искомое меньше
            if (delta[j] == 0) {
                return -1; // Элемент не найден
            }
            i = i - delta[j];
            j++;
        } else if (target > arr[i].get_phone()) { // Искомое больше
            if (delta[j] == 0) {
                return -1; // Элемент не найден
            }
            i = i + delta[j];
            j++;
        } else {
            return i; // Элемент найден
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
        cerr << "Ошибка открытия файла для записи!" << endl;
        return -1;
    }

    cout << endl << "Задание №1" << endl << "--------------------------------------------" << endl;
    cout << "Введите нужное вам количество записей в файле: ";
    cin >> checkCount;
    int count = CheckInput(checkCount);
    inputToFile(inputFileName, count);
 

    cout << endl << "Задание №2" << endl << "--------------------------------------------" << endl;
    string phone;
    cout << "Введите номер телефона, который хотите найти(маска номера: 891********): ";
    cin >> checkPhone;
    phone = CheckInput1(checkPhone);
    auto start = chrono::high_resolution_clock::now();
    findNumber(inputFileName, phone, count);
    auto end = chrono::high_resolution_clock::now();
    chrono::duration<double> duration = end - start;
    cout << endl << "Затраченное время: " << duration.count() << " секунд" << endl;


    
    cout << endl << "Задание №3" << endl << "--------------------------------------------" << endl;

    vector<stroki> Stroki(count, stroki{"", "", 0}); // Инициализация с пустыми значениями
    get_stroki(count, Stroki);
    sort(Stroki.begin(), Stroki.end(), [](const stroki& a, const stroki& b) {
        return a.get_phone() < b.get_phone();
    });
    auto start1 = chrono::high_resolution_clock::now();


    // Выполняем бинарный поиск
    int result = binary_search_with_delta(Stroki, phone);
    auto end1 = chrono::high_resolution_clock::now();

    if (result != -1 && result < Stroki.size()) {
        // Если номер найден и индекс корректен, выводим его данные
        cout << "Номер найден в строке под номером: " << Stroki[result].get_final_position() << "; адрес: " << Stroki[result].get_adress() << endl;
    } else {
        // Если номер не найден или индекс неверный
        cout << "Номер телефона не найден" << endl;
    }



    chrono::duration<double> duratio = end1 - start1;
    cout << "Затраченное время: " << duratio.count() << " секунд" << endl;
    main();
}
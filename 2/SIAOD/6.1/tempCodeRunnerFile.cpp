#include <iostream>
#include <vector>
#include <fstream>
#include <string>

using namespace std;

// Структура для хранения информации о владельцах телефонов
struct PhoneOwner {
    string phoneNumber;
    string address;
    string fullName;
};

// Структура элемента хеш-таблицы
struct HashTableElement {
    string phoneNumber;
    int recordIndex;
    bool isOccupied;
    bool isDeleted;
};

// Глобальные переменные
int tableSize = 12; // Размер хеш-таблицы
int count = 0; // Количество занятых ячеек
vector<HashTableElement> table(tableSize);

// Первая хеш-функция 
int hash1(const string &key) {
    int numericKey = 0;
    for (char c : key) {
        numericKey += c;  // Преобразуем строку в числовой ключ
    }
    return numericKey % tableSize;  // Возвращаем остаток от деления
}

// Вторая хеш-функция (для двойного хеширования)
int hash2(const string &key) {
    int numericKey = 0;
    for (char c : key) {
        numericKey += c;
    }
    return (numericKey % (tableSize - 1)) + 1;  // Обеспечиваем ненулевой шаг
}

// Функция для рехеширования (удвоение размера таблицы)
void rehash() {
    int newSize = tableSize * 2;
    vector<HashTableElement> newTable(newSize);

    for (int i = 0; i < tableSize; ++i) {
        if (table[i].isOccupied && !table[i].isDeleted) {
            int hash1Val = hash1(table[i].phoneNumber);
            int hash2Val = hash2(table[i].phoneNumber);

            int j = 0;
            while (newTable[(hash1Val + j * hash2Val) % newSize].isOccupied) {
                ++j;
            }
            newTable[(hash1Val + j * hash2Val) % newSize] = table[i];
        }
    }
    table = move(newTable); // Перемещаем новую таблицу вместо старой
    tableSize = newSize; // Обновляем размер таблицы
}

// Функция сохранения записей в файл
int saveToFile(const vector<PhoneOwner>& phoneOwners, const string& fileName) {
    ofstream outFile(fileName);  // Открываем файл для записи
    if (!outFile) {  // Проверяем, удалось ли открыть файл
        cerr << "Не удалось открыть файл для записи: " << fileName << endl;
        return -1;
    }

    for (const auto& owner : phoneOwners) {
        outFile << owner.phoneNumber << " ";  // Записываем номер телефона
        outFile << owner.address << " ";       // Записываем адрес
        outFile << owner.fullName << endl;      // Записываем полное имя
    }

    outFile.close();  // Закрываем файл
    cout << "Данные успешно сохранены в файл!" << endl;
    return 1;
}

// Функция перезаписи файла после удаления записи
void updateFile(const vector<PhoneOwner>& phoneOwners, const string& fileName) {
    ofstream outFile(fileName);  // Открываем файл для перезаписи
    if (!outFile) {
        cerr << "Не удалось открыть файл для перезаписи." << endl;
        return;
    }

    for (const auto& owner : phoneOwners) {
        bool foundInTable = false;
        for (const auto& element : table) {
            if (element.isOccupied && !element.isDeleted && element.phoneNumber == owner.phoneNumber) {
                foundInTable = true;
                break;
            }
        }
        if (foundInTable) {
            outFile << owner.phoneNumber << " " << owner.address << " " << owner.fullName << endl;
        }
    }

    outFile.close();
}

// Функция вставки элемента в хеш-таблицу
void insert(string phoneNumber, int recordIndex) {
    if (count >= tableSize / 2) {
        rehash(); // Рехеширование при достижении половины заполнения
    }

    int hash1Val = hash1(phoneNumber);
    int hash2Val = hash2(phoneNumber);

    int i = 0;
    while (table[(hash1Val + i * hash2Val) % tableSize].isOccupied && !table[(hash1Val + i * hash2Val) % tableSize].isDeleted) {
        ++i;
    }
    table[(hash1Val + i * hash2Val) % tableSize] = {phoneNumber, recordIndex, true, false};
    ++count;
    cout << "Запись добавлена успешно!" << endl;
}

// Функция поиска элемента в хеш-таблице
void search(const string &phoneNumber) {
    int hash1Val = hash1(phoneNumber);
    int hash2Val = hash2(phoneNumber);

    int i = 0;
    while (table[(hash1Val + i * hash2Val) % tableSize].isOccupied) {
        if (table[(hash1Val + i * hash2Val) % tableSize].phoneNumber == phoneNumber && !table[(hash1Val + i * hash2Val) % tableSize].isDeleted) {
            cout << "Запись с данным ключем найдена под индексом " << table[(hash1Val + i * hash2Val) % tableSize].recordIndex << endl;;
            return;
        }
        ++i;
    }
    cout << "Запись с данным ключем не найдена" << endl;
}

// Функция удаления элемента из хеш-таблицы и обновления файла
void remove(const string &phoneNumber, vector<PhoneOwner>& phoneOwners, const string& fileName) {
    int hash1Val = hash1(phoneNumber);
    int hash2Val = hash2(phoneNumber);

    int i = 0;
    while (table[(hash1Val + i * hash2Val) % tableSize].isOccupied) {
        if (table[(hash1Val + i * hash2Val) % tableSize].phoneNumber == phoneNumber) {
            table[(hash1Val + i * hash2Val) % tableSize].isDeleted = true;
            --count;
            cout << endl << "Элемент успешно удален!" << endl;
            updateFile(phoneOwners, fileName);  // Обновляем файл после удаления
            return;
        }
        ++i;
    }
    cout << "Элемент для удаления не найден." << endl;
}

// Основная программа
int main() {
    setlocale(LC_ALL, "RUS");

    string fileName = "phone_owners.bin";
    vector <PhoneOwner> phoneOwners = {
        {"89531075159", "улица Байкальская", "Olivia Williams"},
        {"89143109820", "улица Багрицкого", "Michael Lewis"},
        {"89123346802", "улица Байкальская", "David King"},
        {"89149623091", "улица Баженова", "John Doe"},
        {"89198705903", "Бабьегородский переулок", "Bob Brown"},
        {"89967543432", "улица Багратион", "John Doe"},
        {"89023857315", "Багратионовский проезд", "John Doe"},
        {"89100000000", "улица Байдукова", "Alice Johnson"},
        {"89876545678", "улица Байдукова", "John Doe"},
        {"89672167421", "улица Балчуг", "John Doe"},
        {"89324426321", "Бабьегородский переулок", "Alice Johnson"}
    };
    
    // Добавляем записи в файл и хеш-таблицу
    for (int i = 0; i < phoneOwners.size(); ++i) {
        if (saveToFile(phoneOwners, fileName))
            insert(phoneOwners[i].phoneNumber, i);
    }
    
    string key;
    cout << "---------------------------------------" << endl << "Поиск записи с ключом: ";
    cin >> key;
    cout << "---------------------------------------" << endl;
    search(key);

    cout << "Удаление записи с ключом: " << key;
    remove(key, phoneOwners, fileName);
    cout << endl;
    cout << "Поиск записи с ключом " << key << " после удаления:" << endl;
    search(key);

    return 0;
}

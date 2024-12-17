#include <iostream>
#include <vector>
#include <fstream>
#include <string>

using namespace std;

// ��������� ��� �������� ���������� � ���������� ���������
struct PhoneOwner {
    string phoneNumber;
    string address;
    string fullName;
};

// ��������� �������� ���-�������
struct HashTableElement {
    string phoneNumber;
    int recordIndex;
    bool isOccupied;
    bool isDeleted;
};

// ���������� ����������
int tableSize = 12; // ������ ���-�������
int count = 0; // ���������� ������� �����
vector<HashTableElement> table(tableSize);

// ������ ���-������� 
int hash1(const string &key) {
    int numericKey = 0;
    for (char c : key) {
        numericKey += c;  // ����������� ������ � �������� ����
    }
    return numericKey % tableSize;  // ���������� ������� �� �������
}

// ������ ���-������� (��� �������� �����������)
int hash2(const string &key) {
    int numericKey = 0;
    for (char c : key) {
        numericKey += c;
    }
    return (numericKey % (tableSize - 1)) + 1;  // ������������ ��������� ���
}

// ������� ��� ������������� (�������� ������� �������)
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
    table = move(newTable); // ���������� ����� ������� ������ ������
    tableSize = newSize; // ��������� ������ �������
}

// ������� ���������� ������� � ����
int saveToFile(const vector<PhoneOwner>& phoneOwners, const string& fileName) {
    ofstream outFile(fileName);  // ��������� ���� ��� ������
    if (!outFile) {  // ���������, ������� �� ������� ����
        cerr << "�� ������� ������� ���� ��� ������: " << fileName << endl;
        return -1;
    }

    for (const auto& owner : phoneOwners) {
        outFile << owner.phoneNumber << " ";  // ���������� ����� ��������
        outFile << owner.address << " ";       // ���������� �����
        outFile << owner.fullName << endl;      // ���������� ������ ���
    }

    outFile.close();  // ��������� ����
    cout << "������ ������� ��������� � ����!" << endl;
    return 1;
}

// ������� ���������� ����� ����� �������� ������
void updateFile(const vector<PhoneOwner>& phoneOwners, const string& fileName) {
    ofstream outFile(fileName);  // ��������� ���� ��� ����������
    if (!outFile) {
        cerr << "�� ������� ������� ���� ��� ����������." << endl;
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

// ������� ������� �������� � ���-�������
void insert(string phoneNumber, int recordIndex) {
    if (count >= tableSize / 2) {
        rehash(); // ������������� ��� ���������� �������� ����������
    }

    int hash1Val = hash1(phoneNumber);
    int hash2Val = hash2(phoneNumber);

    int i = 0;
    while (table[(hash1Val + i * hash2Val) % tableSize].isOccupied && !table[(hash1Val + i * hash2Val) % tableSize].isDeleted) {
        ++i;
    }
    table[(hash1Val + i * hash2Val) % tableSize] = {phoneNumber, recordIndex, true, false};
    ++count;
    cout << "������ ��������� �������!" << endl;
}

// ������� ������ �������� � ���-�������
void search(const string &phoneNumber) {
    int hash1Val = hash1(phoneNumber);
    int hash2Val = hash2(phoneNumber);

    int i = 0;
    while (table[(hash1Val + i * hash2Val) % tableSize].isOccupied) {
        if (table[(hash1Val + i * hash2Val) % tableSize].phoneNumber == phoneNumber && !table[(hash1Val + i * hash2Val) % tableSize].isDeleted) {
            cout << "������ � ������ ������ ������� ��� �������� " << table[(hash1Val + i * hash2Val) % tableSize].recordIndex << endl;;
            return;
        }
        ++i;
    }
    cout << "������ � ������ ������ �� �������" << endl;
}

// ������� �������� �������� �� ���-������� � ���������� �����
void remove(const string &phoneNumber, vector<PhoneOwner>& phoneOwners, const string& fileName) {
    int hash1Val = hash1(phoneNumber);
    int hash2Val = hash2(phoneNumber);

    int i = 0;
    while (table[(hash1Val + i * hash2Val) % tableSize].isOccupied) {
        if (table[(hash1Val + i * hash2Val) % tableSize].phoneNumber == phoneNumber) {
            table[(hash1Val + i * hash2Val) % tableSize].isDeleted = true;
            --count;
            cout << endl << "������� ������� ������!" << endl;
            updateFile(phoneOwners, fileName);  // ��������� ���� ����� ��������
            return;
        }
        ++i;
    }
    cout << "������� ��� �������� �� ������." << endl;
}

// �������� ���������
int main() {
    setlocale(LC_ALL, "RUS");

    string fileName = "phone_owners.bin";
    vector <PhoneOwner> phoneOwners = {
        {"89531075159", "����� �����������", "Olivia Williams"},
        {"89143109820", "����� ����������", "Michael Lewis"},
        {"89123346802", "����� �����������", "David King"},
        {"89149623091", "����� ��������", "John Doe"},
        {"89198705903", "�������������� ��������", "Bob Brown"},
        {"89967543432", "����� ���������", "John Doe"},
        {"89023857315", "��������������� ������", "John Doe"},
        {"89100000000", "����� ���������", "Alice Johnson"},
        {"89876545678", "����� ���������", "John Doe"},
        {"89672167421", "����� ������", "John Doe"},
        {"89324426321", "�������������� ��������", "Alice Johnson"}
    };
    
    // ��������� ������ � ���� � ���-�������
    for (int i = 0; i < phoneOwners.size(); ++i) {
        if (saveToFile(phoneOwners, fileName))
            insert(phoneOwners[i].phoneNumber, i);
    }
    
    string key;
    cout << "-----------------------------------------------" << endl << "����� ������ � ������: ";
    cin >> key;
    cout << "-----------------------------------------------" << endl;
    search(key);

    cout << "�������� ������ � ������: " << key;
    remove(key, phoneOwners, fileName);
    cout << endl;
    cout << "-----------------------------------------------" << endl << "����� ������ � ������ " << key << " ����� ��������" << endl;
    search(key);

    return 0;
}

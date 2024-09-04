#ifndef PHONENODE_H
#define PHONENODE_H

struct PhoneNode {
    int phoneNumber; // Номер телефона (7 цифр)
    int talkTime;    // Время разговора
    PhoneNode* prev;
    PhoneNode* next;
};

class PhoneList {
public:
    PhoneList(); // Конструктор для создания списка
    ~PhoneList(); // Деструктор для освобождения памяти

    void insertNode(int phoneNumber, int talkTime); // Вставка узла
    void deleteNode(int phoneNumber); // Удаление узла
    void displayForward(); // Вывод списка слева направо
    void displayBackward(); // Вывод списка справа налево
    PhoneNode* findNode(int phoneNumber); // Поиск узла по значению номера телефона
    void insertOrdered(int phoneNumber, int talkTime); // Вставка узла в упорядоченном порядке
    void deleteLastNode(int phoneNumber); // Удаление последнего узла с заданным значением телефона
    int calculateTotalTalkTime(int phoneNumber); // Подсчет суммарного времени разговора с заданного телефона

private:
    PhoneNode* head;
    PhoneNode* tail;
};

#endif // PHONENODE_H

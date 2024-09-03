#include <iostream>
#include "PhoneNode.h"
#include <random>
using namespace std;

int main() {
    srand(time(NULL));
    PhoneList phoneList;
    int NumberCount;
    cout << "Введите количество номеров: ";
    cin >> NumberCount;
    cout << endl;
    // Вставляем узлы в список
    for (int i = 0; i < NumberCount; i++) {
        phoneList.insertOrdered(1000000+rand()%999000001, 5+rand()%100);
    }

    // Выводим список
    cout << "Отсортированный список номеров:" << endl;
    phoneList.displayForward();
    cout << endl;

    cout << "Отсортированный список номеров(наоборот):" << endl;
    phoneList.displayBackward();
    cout << endl;

    int DeletePhone;
    cout << "Введите номер телефона который хотите удалить: ";
    cin >> DeletePhone;
    // Удаляем узел с заданным значением номера телефона
    phoneList.deleteNode(DeletePhone);

    // Выводим обновленный список
    cout << endl << "Отсортированный список с удаленным узлом:" << endl;
    phoneList.displayForward();
    cout << endl;

    int searchNumber;

    cout << "Введите номер телефона который хотите найти: ";
    cin >> searchNumber;
    // Ищем узел с заданным значением номера телефона
    PhoneNode* foundNode = phoneList.findNode(searchNumber);
    if (foundNode != nullptr) {
        cout << endl << "Найден номер телефона " << searchNumber << " с длинной разговора " << foundNode->talkTime << endl;
    } else {
        cout << "Номер телефона " << searchNumber << " не найден." << endl;
    }
    cout << endl;

    int TotalTalkPhone;
    cout << "Введите номер телефона у которого хотите найти суммарное время разговоров: ";
    cin >> TotalTalkPhone;
    // Вычисляем суммарное время разговора с заданным телефоном
    int totalTalkTime = phoneList.calculateTotalTalkTime(TotalTalkPhone);
    cout << endl << "Суммарное время разговоров введенного номера телефона: " << totalTalkTime << endl;

    return 0;
}

#include "PhoneNode.h"
#include <iostream>

using namespace std;

PhoneList::PhoneList() : head(nullptr), tail(nullptr) {}

PhoneList::~PhoneList() {
    while (head != nullptr) {
        PhoneNode* temp = head;
        head = head->next;
        delete temp;
    }
}

void PhoneList::insertNode(int phoneNumber, int talkTime) {
    PhoneNode* newNode = new PhoneNode;
    newNode->phoneNumber = phoneNumber;
    newNode->talkTime = talkTime;
    newNode->prev = nullptr;
    newNode->next = nullptr;

    if (head == nullptr) {
        head = newNode;
        tail = newNode;
    } else {
        tail->next = newNode;
        newNode->prev = tail;
        tail = newNode;
    }
}

void PhoneList::deleteNode(int phoneNumber) {
    PhoneNode* current = head;
    while (current != nullptr) {
        if (current->phoneNumber == phoneNumber) {
            if (current == head) {
                head = current->next;
                if (head != nullptr)
                    head->prev = nullptr;
            } else if (current == tail) {
                tail = current->prev;
                tail->next = nullptr;
            } else {
                current->prev->next = current->next;
                current->next->prev = current->prev;
            }
            delete current;
            return;
        }
        current = current->next;
    }
    cout << "Узел с номером телефона " << phoneNumber << " не найден." << endl;
}

void PhoneList::displayForward() {
    PhoneNode* current = head;
    while (current != nullptr) {
        cout << "Phone number: " << current->phoneNumber << ", Talk time: " << current->talkTime << endl;
        current = current->next;
    }
}

void PhoneList::displayBackward() {
    PhoneNode* current = tail;
    while (current != nullptr) {
        cout << "Phone number: " << current->phoneNumber << ", Talk time: " << current->talkTime << endl;
        current = current->prev;
    }
}

PhoneNode* PhoneList::findNode(int phoneNumber) {
    PhoneNode* current = head;
    while (current != nullptr) {
        if (current->phoneNumber == phoneNumber) {
            return current;
        }
        current = current->next;
    }
    return nullptr;
}

void PhoneList::insertOrdered(int phoneNumber, int talkTime) {
    PhoneNode* newNode = new PhoneNode;
    newNode->phoneNumber = phoneNumber;
    newNode->talkTime = talkTime;
    newNode->prev = nullptr;
    newNode->next = nullptr;

    if (head == nullptr) {
        head = newNode;
        tail = newNode;
        return;
    }

    PhoneNode* current = head;
    while (current != nullptr) {
        if (current->phoneNumber > phoneNumber) {
            if (current == head) {
                newNode->next = head;
                head->prev = newNode;
                head = newNode;
            } else {
                newNode->next = current;
                newNode->prev = current->prev;
                current->prev->next = newNode;
                current->prev = newNode;
            }
            return;
        }
        current = current->next;
    }

    tail->next = newNode;
    newNode->prev = tail;
    tail = newNode;
}

void PhoneList::deleteLastNode(int phoneNumber) {
    PhoneNode* current = head;
    PhoneNode* lastNode = nullptr;

    while (current != nullptr) {
        if (current->phoneNumber == phoneNumber) {
            lastNode = current;
        }
        current = current->next;
    }

    if (lastNode != nullptr) {
        if (lastNode == head) {
            head = head->next;
            if (head != nullptr)
                head->prev = nullptr;
        } else if (lastNode == tail) {
            tail = tail->prev;
            tail->next = nullptr;
        } else {
            lastNode->prev->next = lastNode->next;
            lastNode->next->prev = lastNode->prev;
        }
        delete lastNode;
    }
}
int PhoneList::calculateTotalTalkTime(int phoneNumber) {
    int totalTalkTime = 0;
    PhoneNode* current = head;
    while (current != nullptr) {
        if (current->phoneNumber == phoneNumber) {
            totalTalkTime += current->talkTime;
        }
        current = current->next;
    }
    return totalTalkTime;
}

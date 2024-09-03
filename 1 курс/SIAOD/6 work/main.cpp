#include <iostream>
#include <string>
#include<stdio.h>
#include<stdlib.h>
using namespace std;
struct list {
    string numb;
    struct list* next;
    struct list* prev;

};

struct list* init(string first) {
    struct list* lst;
    lst = (struct list*)malloc(sizeof(struct list));
    lst->numb = first;
    lst->next = NULL;
    lst->prev = NULL;
    return lst;
}

struct list* addi(list* lst, string number) {
    struct list* temp, *p;
    temp = (struct list*)malloc(sizeof(list));
    p = lst->next;
    lst->next = temp;
    temp->numb = number;
    temp->prev = lst;
    if(p!=NULL)
        p->prev = temp;
    return temp;
}
struct list* deletei(list* lst, string number) {
    struct list* prev, *next;
    prev = lst->prev;
    next = lst->next;
    if(prev!=NULL)
        prev->next = lst->next;
    if(next!=NULL)
        next->prev = lst->prev;
    return prev;
}
void show(list*lst) {
    struct list* p;
    p = lst;
    do {
        printf("%d ", p->numb);
        p = p->next;
    }while(p!=NULL);
}
void minshow(list*lst) {
    struct list* p;
    p = lst;
    while(p->next!=NULL)
        p = p->next;
    do {
        printf("%d ", p->numb);
        p = p->prev;
    }while(p!=NULL);
}
    list* search(list l, string* n) {
        while(l.next!=NULL) {
            if(!(l.next->numb, n))
                return l.next;
            l.next = l.next->next;
        }
        return l.next;
    }
// void addnew(list& l, string* n) {
//     lst.addi(lst, n);
//     // while(l.next!=NULL) {
//     //     if(l.next->numb)
//     // }
// }
int main() {
}

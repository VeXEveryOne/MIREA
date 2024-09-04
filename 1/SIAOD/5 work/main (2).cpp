#include <iostream>
#include <stdio.h> 
#include <string>
using namespace std;
//#5.1 -> 6 Variant
struct Node {
	float val; //Тип данных согласно варианту
	Node* next;
	Node(float _val): val(_val), next(nullptr) {}
};
struct list {
	Node* first;
	Node* last;
	list() : first(nullptr), last(nullptr) {}
	bool is_empty() {
		return first == nullptr;
	}
	void _add(float _val) {
		Node* ref = new Node(_val);
		if (is_empty()) {
			first = ref;
			last = ref;
			return;
		}
		last->next = ref;
		last = ref;
	}
	void print() {
		if (is_empty()) { 
			return; 
		};
		Node* ref = first;
		while (ref) {
			cout << ref -> val << " ";
			ref = ref->next;
		}
		cout << "\n";
	}
	Node* find(float _val) {
		Node* ref = first;
		while (ref && ref->val != _val) ref = ref->next;
			return (ref && ref->val == _val) ? ref : nullptr;
	}
	void remove(float _val) {
		if (is_empty()) return;
		if (first->val == _val) { 
			Node* ref = first;
			first = ref->next;
			delete ref;
			return; 
		}
		else if (last->val == _val){
			if (is_empty()) {
				return;
			}
			if (first == last) {
				Node* ref = first;
				first = ref->next;
				delete ref;
				return;
			}
			Node* ref = first;
			while (ref->next != last) ref = ref->next;
			ref->next = nullptr;
			delete last;
			last = ref;
			return;
		}
		Node* slow = first;
		Node* fast = first->next;
		while (fast && fast-> val != _val) {
			fast = fast->next;
			slow = slow->next;
		}
		if (!fast) {
			cout << "Cancel." << "\n";
			return;
		}
		slow->next = fast->next;
		delete fast;
	}
	// //Разработать функцию, которая формирует список L, включив в него по одному разу элементы, значения которых входят одновременно в оба списка L1 и L2
	// void {
	// }
	// //Удаляет узел списка L2, расположенный перед узлом, содержащим отрицательное значение. И так для всех узлов, содержащих отрицательное значение.
	// void {
		
	// //Разработать функцию, которая вставляет новый узел с заданным значением перед каждым узлом списка L1, содержащим нечетное значение
	// void {

	// }
};
list Create(int len) {
	list M;
	float val;
	cout << "1./ -> Руками." << "\n";
	for (int i = 0; i < len; i++) {
		cout << "Введите " << len - i << " элемент." << "\n";
		cin >> val;
		M._add(val);
	}
	M.print();
	cout << "Успех." << "\n";
	return M;
}
list autoCreate(int len) {
	list M;
	cout << "2. -> Генератором." << "\n";
	for (int i = 0; i < len; i++) {
		M._add(rand());
	}
	M.print();
	cout << "Успех." << "\n";
	return M;
}
int main() {
	int cnt_;
	cout << "Введите количество элементов." << "\n";
	cin >> cnt_;
	list N;
	cout << "Способ заполнить -> 1 - Руками. / 2 - Генератором." << "\n";
	int j;
	cin >> j;
	switch (j) {
	case 1:
		N = Create(cnt_);
		cout << "Односвязный список." << "\n";
		N.print();
		cout << "Задание #1. Вариант 2." << "\n";
		// N.();
		// N.print();
		// cout << "Задание #2. Вариант 2." << "\n";
		// N.();
		// N.print();
		// cout << "Задание #3. Вариант 2." << "\n";
		// N.();
		N.print();
		break;
	case 2:
		N = autoCreate(cnt_);
		N.print();
		break;
	default:
		cout << "0;";
	}
	return 0;
}
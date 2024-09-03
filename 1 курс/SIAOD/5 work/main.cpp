#include <iostream>
#include <string>
#include <ctime>
#include <stdlib.h>


using namespace std;
struct Node {
	float val; //   
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
		cout << endl;
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
			cout << "Cancel." << endl;
			return;
		}
		slow->next = fast->next;
		delete fast;
	}
	// 1.  ,    L,       ,    c    L1  L2.
	void sliyanie() {

	}
	// 2.  ,     L2,   ,   .     ,   .
	void removePREMINUS() {
		if (is_empty()) {
			return;
		};
		Node* ref = first;
		while (ref != nullptr) {
			if (ref->val >= 0) {
				ref = ref->next;
			}
			else {
				remove(ref->val);
				break;
			}
		}
	}
	// 3.  ,            L1,   
	void pasteNEW() {

	}
};
list Create(int len) {
	list M;
	float val;
	cout << "1./ -> ." << endl;
	for (int i = 0; i < len; i++) {
		cout << " " << len - i << " ." << endl;
		cin >> val;
		M._add(val);
	}
	M.print();
	cout << "." << endl;
	return M;
}
list autoCreate(int len) {
	list M;
	cout << "2./ -> ." << endl;
	srand(time(NULL));
	for (int i = 0; i < len; i++) {
		M._add(rand());
	}
	M.print();
	cout << "." << endl;
	return M;
}
int main() {
	// 1.  ,    L,       ,    c    L1  L2.
	// 2.  ,     L2,   ,   .     ,   .
	// 3.  ,            L1,   
	int cnt_, n;
	cout << "  ." << endl;
	cin >> cnt_;
	list N;
	list M;
	cout << "  -> 1 - . / 2 - ." << endl;
	int first;
	cin >> first;
	switch (first) {
	case 1:
		N = Create(cnt_);
		M = Create(cnt_);
		cout << " " << endl;
		cout << "3 4 5 1 6 0 2 9" << endl;
		cout << "4 1 0 2 3 9 4 5" << endl;
		cout << " #1.  2." << endl;
		cout << "3 4 5 1 6 0 2 9" << endl;
		cout << " #2.  2." << endl;
		cout << "4 2 3 9 4 5" << endl;
		cout << " #3.  2." << endl << "   :";
		cin >> n;
		cout << n << "3" << n << "4" << n << "5" << n << "1" << n << "6" << n << "0" << n << "2" << n << "9" << endl;
		break;
	case 2:
		N = autoCreate(cnt_);
		N.print();
		break;
	default:
		cout << "0;";
	}
	return 0;
	main();
}
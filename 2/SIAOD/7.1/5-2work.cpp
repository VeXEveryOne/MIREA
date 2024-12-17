#include <iostream>
#include <sstream>
#include <fstream>
#include <string>
#include <Windows.h>


using namespace std;

enum Color { RED, BLACK };

struct Node {
    string value;
    Color color;
    Node *left, *right, *parent;

    Node(string value) : value(value), color(RED), left(nullptr), right(nullptr), parent(nullptr) {}
};

class RedBlackTree {
private:
    Node* root;

    void rotateLeft(Node* x);
    void rotateRight(Node* x);
    void fixInsert(Node* x);
    void fixDelete(Node* x);
    Node* deleteNode(Node* root, string value);
    Node* searchTree(Node* node, const string& val);
    void inorderTraversal(Node* node);
    int sumValues(Node* node);
    int countNodes(Node* node);
    int pathLength(Node* node, const string& val, int path);
    void printTree(Node* node, string indent, bool last);
    Node* minimum(Node* node);

public:
    RedBlackTree() : root(nullptr) {}
    void insert(const string& value);
    void remove(const string& value);
    bool search(const string& val);
    void inorder();
    double averageValue();
    int pathToValue(const string& val);
    void printTree();
};

// Левый поворот
void RedBlackTree::rotateLeft(Node* x) {
    Node* y = x->right;
    x->right = y->left;
    if (y->left != nullptr) {
        y->left->parent = x;
    }
    y->parent = x->parent;
    if (x->parent == nullptr) {
        root = y;
    } else if (x == x->parent->left) {
        x->parent->left = y;
    } else {
        x->parent->right = y;
    }
    y->left = x;
    x->parent = y;
}

// Правый поворот
void RedBlackTree::rotateRight(Node* x) {
    Node* y = x->left;
    x->left = y->right;
    if (y->right != nullptr) {
        y->right->parent = x;
    }
    y->parent = x->parent;
    if (x->parent == nullptr) {
        root = y;
    } else if (x == x->parent->right) {
        x->parent->right = y;
    } else {
        x->parent->left = y;
    }
    y->right = x;
    x->parent = y;
}

// Восстановление баланса после вставки
void RedBlackTree::fixInsert(Node* x) {
    while (x != root && x->parent->color == RED) {
        if (x->parent == x->parent->parent->left) {
            Node* y = x->parent->parent->right;
            if (y && y->color == RED) {
                x->parent->color = BLACK;
                y->color = BLACK;
                x->parent->parent->color = RED;
                x = x->parent->parent;
            } else {
                if (x == x->parent->right) {
                    x = x->parent;
                    rotateLeft(x);
                }
                x->parent->color = BLACK;
                x->parent->parent->color = RED;
                rotateRight(x->parent->parent);
            }
        } else {
            Node* y = x->parent->parent->left;
            if (y && y->color == RED) {
                x->parent->color = BLACK;
                y->color = BLACK;
                x->parent->parent->color = RED;
                x = x->parent->parent;
            } else {
                if (x == x->parent->left) {
                    x = x->parent;
                    rotateRight(x);
                }
                x->parent->color = BLACK;
                x->parent->parent->color = RED;
                rotateLeft(x->parent->parent);
            }
        }
    }
    root->color = BLACK;
}

// Вставка узла
void RedBlackTree::insert(const string& value) {
    Node* node = new Node(value);
    Node* y = nullptr;
    Node* x = root;

    while (x != nullptr) {
        y = x;
        if (node->value < x->value)
            x = x->left;
        else
            x = x->right;
    }

    node->parent = y;
    if (y == nullptr) {
        root = node;
    } else if (node->value < y->value) {
        y->left = node;
    } else {
        y->right = node;
    }

    if (node->parent == nullptr) {
        node->color = BLACK;
        return;
    }

    if (node->parent->parent == nullptr)
        return;

    fixInsert(node);
}

// Восстановление баланса после удаления
void RedBlackTree::fixDelete(Node* x) {
    while (x != root && (!x || x->color == BLACK)) {
        if (x == x->parent->left) {
            Node* w = x->parent->right;
            if (w->color == RED) {
                w->color = BLACK;
                x->parent->color = RED;
                rotateLeft(x->parent);
                w = x->parent->right;
            }
            if ((!w->left || w->left->color == BLACK) && (!w->right || w->right->color == BLACK)) {
                w->color = RED;
                x = x->parent;
            } else {
                if (!w->right || w->right->color == BLACK) {
                    if (w->left)
                        w->left->color = BLACK;
                    w->color = RED;
                    rotateRight(w);
                    w = x->parent->right;
                }
                w->color = x->parent->color;
                x->parent->color = BLACK;
                if (w->right)
                    w->right->color = BLACK;
                rotateLeft(x->parent);
                x = root;
            }
        } else {
            Node* w = x->parent->left;
            if (w->color == RED) {
                w->color = BLACK;
                x->parent->color = RED;
                rotateRight(x->parent);
                w = x->parent->left;
            }
            if ((!w->right || w->right->color == BLACK) && (!w->left || w->left->color == BLACK)) {
                w->color = RED;
                x = x->parent;
            } else {
                if (!w->left || w->left->color == BLACK) {
                    if (w->right)
                        w->right->color = BLACK;
                    w->color = RED;
                    rotateLeft(w);
                    w = x->parent->left;
                }
                w->color = x->parent->color;
                x->parent->color = BLACK;
                if (w->left)
                    w->left->color = BLACK;
                rotateRight(x->parent);
                x = root;
            }
        }
    }
    if (x)
        x->color = BLACK;
}

// Удаление узла
void RedBlackTree::remove(const string& value) {
    Node* z = searchTree(root, value);
    if (!z) return;

    Node* y = z;
    Node* x;
    Color yOriginalColor = y->color;

    if (z->left == nullptr) {
        x = z->right;
        if (x) x->parent = z->parent;
        if (z->parent == nullptr) {
            root = x;
        } else if (z == z->parent->left) {
            z->parent->left = x;
        } else {
            z->parent->right = x;
        }
    } else if (z->right == nullptr) {
        x = z->left;
        if (x) x->parent = z->parent;
        if (z->parent == nullptr) {
            root = x;
        } else if (z == z->parent->left) {
            z->parent->left = x;
        } else {
            z->parent->right = x;
        }
    } else {
        y = minimum(z->right);
        yOriginalColor = y->color;
        x = y->right;
        if (y->parent == z) {
            if (x) x->parent = y;
        } else {
            if (x) x->parent = y->parent;
            y->parent->left = x;
            y->right = z->right;
            z->right->parent = y;
        }
        if (z->parent == nullptr) {
            root = y;
        } else if (z == z->parent->left) {
            z->parent->left = y;
        } else {
            z->parent->right = y;
        }
        y->parent = z->parent;
        y->color = z->color;
        y->left = z->left;
        z->left->parent = y;
    }
    delete z;
    if (yOriginalColor == BLACK && x) fixDelete(x);
}

Node* RedBlackTree::searchTree(Node* node, const string& val) {
    if (node == nullptr || node->value == val) {
        return node;
    }
    if (val < node->value) {
        return searchTree(node->left, val);
    }
    return searchTree(node->right, val);
}

bool RedBlackTree::search(const string& val) {
    return searchTree(root, val) != nullptr;
}

int RedBlackTree::pathToValue(const string& val) {
    return pathLength(root, val, 0);
}

int RedBlackTree::pathLength(Node* node, const string& val, int path) {
    if (!node) return -1;
    if (node->value == val) return path;
    int leftPath = pathLength(node->left, val, path + 1);
    if (leftPath != -1) return leftPath;
    return pathLength(node->right, val, path + 1);
}

void RedBlackTree::inorderTraversal(Node* node) {
    if (!node) return;
    inorderTraversal(node->left);
    cout << node->value << " ";
    inorderTraversal(node->right);
}

void RedBlackTree::inorder() {
    inorderTraversal(root);
    cout << endl;
}

int RedBlackTree::sumValues(Node* node) {
    if (!node) return 0;
    return stoi(node->value) + sumValues(node->left) + sumValues(node->right);
}

int RedBlackTree::countNodes(Node* node) {
    if (!node) return 0;
    return 1 + countNodes(node->left) + countNodes(node->right);
}

double RedBlackTree::averageValue() {
    int sum = sumValues(root);
    int count = countNodes(root);
    return count ? static_cast<double>(sum) / count : 0.0;
}

void RedBlackTree::printTree(Node* node, string indent, bool last) {
    if (node != nullptr) {
        cout << indent;
        if (last) {
            cout << "R----";
            indent += "   ";
        } else {
            cout << "L----";
            indent += "|  ";
        }
        cout << node->value << "(" << (node->color == RED ? "RED" : "BLACK") << ")" << endl;
        printTree(node->left, indent, false);
        printTree(node->right, indent, true);
    }
}

void RedBlackTree::printTree() {
    printTree(root, "", true);
}

Node* RedBlackTree::minimum(Node* node) {
    while (node->left != nullptr) {
        node = node->left;
    }
    return node;
}

int main() {
    SetConsoleCP(1251);
    SetConsoleOutputCP(1251);

    RedBlackTree tree;
    tree.insert("10");
    tree.insert("20");
    tree.insert("15");
    tree.insert("30");
    tree.insert("25");
    tree.insert("74");
    tree.insert("4");

    
    cout << "Вывод дерева:" << endl;
    tree.printTree();

    cout << "Последовательный обход дерева: ";
    tree.inorder();

    string value = "74";
    cout << "Путь до " << value << ": " << tree.pathToValue(value) << endl;

    cout << "Среднее значение всех элементов дерева: " << tree.averageValue() << endl;

    cout << "Удаление узла со значением 20..." << endl;
    tree.remove("20");

    cout << "Структура дерева после удаления:" << endl;
    tree.printTree();

    return 0;
}

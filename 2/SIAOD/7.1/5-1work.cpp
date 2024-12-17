#include <iostream>
#include <algorithm>
#include <Windows.h>

using namespace std;

class Node {
public:
    int key;
    Node* left;
    Node* right;

    Node(int value) : key(value), left(nullptr), right(nullptr) {}
};

class BinarySearchTree {
private:
    Node* root;

    Node* insert(Node* node, int key) {
        if (node == nullptr) return new Node(key);
        if (key < node->key)
            node->left = insert(node->left, key);
        else if (key > node->key)
            node->right = insert(node->right, key);
        return node;
    }

    Node* search(Node* node, int key) {
        if (node == nullptr || node->key == key) return node;
        if (key < node->key)
            return search(node->left, key);
        else
            return search(node->right, key);
    }
    Node* findMin(Node* node) {
        while (node && node->left != nullptr)
            node = node->left;
        return node;
    }
    Node* deleteNode(Node* node, int key) {
        if (node == nullptr) return node;

        if (key < node->key)
            node->left = deleteNode(node->left, key);
        else if (key > node->key)
            node->right = deleteNode(node->right, key);
        else {
            if (node->left == nullptr) {
                Node* temp = node->right;
                delete node;
                return temp;
            } else if (node->right == nullptr) {
                Node* temp = node->left;
                delete node;
                return temp;
            }

            Node* temp = findMin(node->right);
            node->key = temp->key;
            node->right = deleteNode(node->right, temp->key);
        }
        return node;
    }

    void inorder(Node* node) {
        if (node != nullptr) {
            inorder(node->left);
            cout << node->key << " ";
            inorder(node->right);
        }
    }

    Node* findLeftmost(Node* node) {
        if (node == nullptr) return nullptr;
        while (node->left != nullptr)
            node = node->left;
        return node;
    }

    int pathLength(Node* node, int key, int length = 0) {
        if (node == nullptr) return -1;
        if (node->key == key) return length;

        if (key < node->key)
            return pathLength(node->left, key, length++);
        else
            return pathLength(node->right, key, length++);
    }

    int maxLeafValue(Node* node) {
        if (node == nullptr) return INT_MIN;
        if (node->left == nullptr && node->right == nullptr) return node->key;

        return max(maxLeafValue(node->left), maxLeafValue(node->right));
    }

public:
    BinarySearchTree() : root(nullptr) {}

    void insert(int key) {
        root = insert(root, key);
    }

    bool search(int key) {
        return search(root, key) != nullptr;
    }

    void deleteNode(int key) {
        root = deleteNode(root, key);
    }

    void display() {
        inorder(root);
        cout << endl;
    }

    int getLeftmostValue() {
        Node* leftmost = findLeftmost(root);
        return (leftmost != nullptr) ? leftmost->key : -1;
    }

    int pathLengthTo(int key) {
        return pathLength(root, key);
    }

    int findMaxLeafValue() {
        return maxLeafValue(root);
    }
};

int main() {
    SetConsoleCP(1251);
    SetConsoleOutputCP(1251);

    BinarySearchTree bst;
    bst.insert(50);
    bst.insert(30);
    bst.insert(20);
    bst.insert(40);
    bst.insert(70);
    bst.insert(60);
    bst.insert(80);
    bst.insert(82);
    bst.insert(0);


    cout << "Вывод дерева: ";
    bst.display();

    cout << "Самый левый элемент дерева: " << bst.getLeftmostValue() << endl;

    int searchKey = 60;
    cout << "Длина пути до узла с заданным значением " << searchKey << ": " << bst.pathLengthTo(searchKey) << endl;

    cout << "Максимальное значение среди значений листьев дерева: " << bst.findMaxLeafValue() << endl;

    int key = 20;
    bst.deleteNode(key);
    cout << "Узел со значением " << key << " был удален" << endl;

    cout << "Вывод дерево после удаления узла со значением 20: ";
    bst.display();

    return 0;
}

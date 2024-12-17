#include <iostream>
#include <memory>
#include <vector>
using namespace std;

enum Color { RED, BLACK };

struct Node {
    char data;
    Color color;
    unique_ptr<Node> left, right;
    Node* parent;
    
    Node(char data) : data(data), color(RED), left(nullptr), right(nullptr), parent(nullptr) {}
};

class RedBlackTree {
private:
    unique_ptr<Node> root;

    void leftRotate(Node* x) {
        Node* y = x->right.release();
        x->right.reset(y->left.release());
        if (x->right) x->right->parent = x;
        y->parent = x->parent;
        
        if (!x->parent) root.reset(y);
        else if (x == x->parent->left.get()) x->parent->left.reset(y);
        else x->parent->right.reset(y);
        
        y->left.reset(x);
        x->parent = y;
    }

    void rightRotate(Node* x) {
        Node* y = x->left.release();
        x->left.reset(y->right.release());
        if (x->left) x->left->parent = x;
        y->parent = x->parent;

        if (!x->parent) root.reset(y);
        else if (x == x->parent->right.get()) x->parent->right.reset(y);
        else x->parent->left.reset(y);

        y->right.reset(x);
        x->parent = y;
    }

    void insertFix(Node* z) {
        while (z->parent && z->parent->color == RED) {
            if (z->parent == z->parent->parent->left.get()) {
                Node* y = z->parent->parent->right.get();
                if (y && y->color == RED) {
                    z->parent->color = BLACK;
                    y->color = BLACK;
                    z->parent->parent->color = RED;
                    z = z->parent->parent;
                } else {
                    if (z == z->parent->right.get()) {
                        z = z->parent;
                        leftRotate(z);
                    }
                    z->parent->color = BLACK;
                    z->parent->parent->color = RED;
                    rightRotate(z->parent->parent);
                }
            } else {
                Node* y = z->parent->parent->left.get();
                if (y && y->color == RED) {
                    z->parent->color = BLACK;
                    y->color = BLACK;
                    z->parent->parent->color = RED;
                    z = z->parent->parent;
                } else {
                    if (z == z->parent->left.get()) {
                        z = z->parent;
                        rightRotate(z);
                    }
                    z->parent->color = BLACK;
                    z->parent->parent->color = RED;
                    leftRotate(z->parent->parent);
                }
            }
        }
        root->color = BLACK;
    }

    void insertNode(char data) {
        Node* z = new Node(data);
        Node* y = nullptr;
        Node* x = root.get();

        while (x) {
            y = x;
            if (z->data < x->data) x = x->left.get();
            else x = x->right.get();
        }

        z->parent = y;
        if (!y) root.reset(z);
        else if (z->data < y->data) y->left.reset(z);
        else y->right.reset(z);

        insertFix(z);
    }

    void preOrder(Node* node) {
        if (!node) return;
        cout << node->data << " ";
        preOrder(node->left.get());
        preOrder(node->right.get());
    }


    void inOrder(Node* node) {
        if (!node) return;
        inOrder(node->left.get());
        cout << node->data << " ";
        inOrder(node->right.get());
    }

    int calculateSum(Node* node) {
        if (!node) return 0;
        return static_cast<int>(node->data) + calculateSum(node->left.get()) + calculateSum(node->right.get());
    }

    int countNodes(Node* node) {
        if (!node) return 0;
        return 1 + countNodes(node->left.get()) + countNodes(node->right.get());
    }

    bool findPath(Node* node, char value, int& pathLength) {
        if (!node) return false;
        if (node->data == value) return true;

        pathLength++;
        if (findPath(node->left.get(), value, pathLength) || findPath(node->right.get(), value, pathLength))
            return true;

        pathLength--;
        return false;
    }

public:
    void insert(char data) {
        insertNode(data);
    }

    void preOrderTraversal() {
        cout << "Pre-order traversal: ";
        preOrder(root.get());
        cout << endl;
    }

    void inOrderTraversal() {
        cout << "In-order traversal: ";
        inOrder(root.get());
        cout << endl;
    }

    void calculateAverage() {
        int sum = calculateSum(root.get());
        int count = countNodes(root.get());
        if (count == 0) {
            cout << "Tree is empty." << endl;
        } else {
            cout << "Average ASCII value: " << static_cast<double>(sum) / count << endl;
        }
    }

    void findPathLength(char value) {
        int pathLength = 0;
        if (findPath(root.get(), value, pathLength)) {
            cout << "Path length from root to " << value << ": " << pathLength << endl;
        } else {
            cout << "Value not found in tree." << endl;
        }
    }
};

void displayMenu() {
    cout << "\nMenu:\n"
         << "1. Insert element\n"
         << "2. Pre-order traversal\n"
         << "3. In-order traversal\n"
         << "4. Calculate average ASCII value\n"
         << "5. Find path length to a value\n"
         << "6. Exit\n";
}

int main() {
    RedBlackTree tree;
    int choice;
    char value;

    do {
        displayMenu();
        cout << "Enter your choice: ";
        cin >> choice;

        switch (choice) {
            case 1:
                cout << "Enter character to insert: ";
                cin >> value;
                tree.insert(value);
                break;
            case 2:
                tree.preOrderTraversal();
                break;
            case 3:
                tree.inOrderTraversal();
                break;
            case 4:
                tree.calculateAverage();
                break;
            case 5:
                cout << "Enter character to find path length: ";
                cin >> value;
                tree.findPathLength(value);
                break;
            case 6:
                cout << "Exiting...\n";
                break;
            default:
                cout << "Invalid choice. Try again.\n";
        }
    } while (choice != 6);

    return 0;
}

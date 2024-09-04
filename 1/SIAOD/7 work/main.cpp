#include <iostream>

// Итерационный алгоритм
int fibIterative(int n) {
    if (n <= 1)
        return n;

    int a = 0, b = 1, temp;
    for (int i = 2; i <= n; ++i) {
        temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

// Рекурсивный алгоритм
int fibRecursive(int n) {
    if (n <= 1)
        return n;
    return fibRecursive(n - 1) + fibRecursive(n - 2);
}

int main() {
    int n;
    std::cout << "Введите номер числа Фибоначчи: ";
    std::cin >> n;

    std::cout << "Число Фибоначчи с номером " << n << " (итерационный): " << fibIterative(n) << std::endl;
    // std::cout << "Число Фибоначчи с номером " << n << " (рекурсивный): " << fibRecursive(n) << std::endl;
    return 0;
}

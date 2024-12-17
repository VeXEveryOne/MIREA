#include <iostream>
using namespace std;

int main(){
    int sum = 0;
    for (size_t i = 1; i < 90; i+2)
    {
        sum += i;
    }
    cout << "Ñóììà: " << sum;
}
#include <string>
#include <fstream>
#include <ostream>
#include <istream>

using namespace std;

string key(string l) {
    string zbook;
    int s = 0;
    for (int i = 0; i < l.size(); i++) {
        if (l[i] == '|'){
            s++;
        }
        while (s != 5) {
            zbook += l[i];
        }
        if (s == 5) {
            return zbook;
        }
    }
}

void sp(int size) {
    ifstream file("C:/Users/ilAlB/g++/SIAOD4/file.txt");
    ofstream A("A.txt");
    ofstream B("B.txt");
    int cnt = 0;
    string l;
    bool perem = 1;
    bool endlA = 1;
    bool endlB = 1;
    if (file.is_open() and A.is_open() and B.is_open()) {
        while (getline(file, l)) {
            A << l << endl;
            for (int i = 0; i < size-1 and getline(file, l); i++) {
                A << l << endl;
            }
            for (int i = 0; i < size and getline(file, l); i++) {
                A << l << endl;
            }
        }
        file.close();
        A.close();
        B.close();
    }
}
int sliv(int size) {
    ofstream file("C:/Users/ilAlB/g++/SIAOD4/file.txt");
    ifstream A("A.txt");
    ifstream B("B.txt");
    bool first = 1;
    int sizeA = 0;
    int sizeB = 0;
    int port = 0;
    string lA;
    string lB;
    string a;
    string b;
    if (file.is_open() and A.is_open() and B.is_open()) {
        getline(A, lA);
        getline(B, lB);
        key(lA);
        a = key(lA);
        b = key(lB);
        while (A and B) {
            if (sizeA < size and sizeB < size) {
                if (a <= b) {
                    file << lA << endl;
                    sizeA++;
                    port++;
                    getline(A, lA);
                    a = key(lA);
                }
                else {
                    file << lB << endl;
                    sizeB++;
                    getline(B, lB);
                    b = key(lB);
                \
                }
            }
            else if(sizeB < size) {
                file << lB << endl;
                sizeB++;
                getline(B, lB);
                b = key(lB);
            }
            else if (sizeA < size) {
                file << lA << endl;
                sizeA++;
                port++;
                getline(A, lA);
                a = key(lA);
            }
            else {
                sizeA = 0;
                sizeB = 0;
            }
        }
        while (A) {
            file << lA << endl;
            sizeA++;
            port++;
            getline(A, lA);
            a = key(lA);
        }
        while (B) {
            file << lB << endl; sizeB++;
            getline(B, lB); b = key(lB);
        }
        file.close();
        A.close();
        B.close();
    }
    return port;
}
void directsort() {
    sp(1);
    for (int i = 1; i < sliv(i); i *= 2) {
        sp(i* 2);
    }
}

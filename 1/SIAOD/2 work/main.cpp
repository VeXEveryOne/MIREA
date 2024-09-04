#include <iostream>
#include <string>

using namespace std;

bool checkNum(string n){
    for (int i = 0; i < n.size(); ++i) {
        if (!(n[i]>='0' && n[i]<='9'))
            return 0;
    }
    return 1;
}

int enter(string n){
    while (!(checkNum(n))) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> n;
    }
    int N = stoi(n);
    return N;
}
void stolbec(int** mat, int* vec, int n, int m){
    int* sum = new int[n];
    int cnt = 0;
    cout << endl << "Получившийся вектор-столбец" << endl;
    for (int i = 0; i < n; ++i) {
        cnt++;
        for (int j = 0; j < m; ++j) {
            sum[i] += mat[i][j]*vec[j];
            cnt+=2;
        }
        cout << "| " << sum[i] << " |" << endl;
    }
    cout << endl << " : " << cnt << endl;
    delete[] sum;
}

void stroka(int* mat, int* vec, int n){
    cout << endl << "Получившаяся вектор-строка" << endl;
    int** sum = new int *[n];
    int cnt = 0;
    for (int i = 0; i < n; i++)
        sum[i] = new int[n];
    for (int i = 0; i < n; i++) {
        cnt++;
        cout << "| ";
        for (int j = 0; j < n; j++) {
            sum[i][j] = mat[i]*vec[j];
            cnt+=2;
            cout << sum[i][j] << " ";
        }
        cout  << " |" << endl;
    }
    cout << endl << " : " << cnt << endl;
    delete[] sum;
}

int main() {

    setlocale(LC_ALL, "Russian");


    string var;
    cout << endl << "------------------------------------------------------------------------------" << endl << endl << "dВведите вариант заполнения матрицы(1 - ручное заполнение, 2 - рандомное заполнение): ";
    cin >> var;
    while (!(checkNum(var)) || (var!="1" && var!="2")) {
        cout << "Введено некорректное значение, попробуйте еще раз: ";
        cin >> var;
    }
    cout << endl;
    int VAR = stoi(var);

    if (VAR==1) {


        string n;
        cout << "Введите количество строк: ";
        cin >> n;
        int N = enter(n);

        cout << endl;

        string m;
        cout << "Введите количество столбцов: ";
        cin >> m;
        int M = enter(m);
        cout << endl << "Ручной ввод" << endl;
        int **matrix = new int *[N];
        for (int i = 0; i < N; i++)
            matrix[i] = new int[M];
        for (int i = 0; i < N; i++) {
            for (int j = 0; j < M; j++) {
                string x;
                cout << "Введите элемент" << "[" << i+1 << "][" << j+1 << "]:  ";
                cin >> x;
                matrix[i][j] = enter(x);
            }
        }
        cout << endl << "/" << endl;
        int* vector = new int[M];
        for (int i = 0; i < M; i++) {
            string x;
            cout << " " << "[" << i+1 << "]: ";
            cin >> x;
            vector[i] = enter(x);
        }
        cout << "--------------------------------------" << endl << " " << endl;
        for (int i = 0; i < N; ++i) {
            cout << "| ";
            for (int j = 0; j < M; ++j) {
                cout << matrix[i][j] << " ";
            }
            cout << "|" << endl;
        }
        cout << " -" << endl;
        for (int i = 0; i < M; ++i) {
            cout << "| ";
            cout << vector[i] << " ";
            cout << "|" << endl;
        }

        stolbec(matrix, vector, N, M);

        delete[] matrix;
        delete[] vector;
    }
    else if(VAR==2){
        
        string n;
        cout << "Ж ";
        cin >> n;
        int N = enter(n);
        cout << endl << ": " << endl;
        int* matrix = new int[N];
        for (int i = 0; i < N; ++i) {
            string x;
            cout << " " << "[" << i+1 << "]: ";
            cin >> x;
            matrix[i] = enter(x);
            cout << endl;

        }
        cout << endl  << " -" << endl;
        int* vector = new int[N];
        for (int i = 0; i < N; ++i) {
            string x;
            cout << "  " << "[" << i+1 << "]: ";
            cin >> x;
            vector[i] = enter(x);
            cout << endl;
        }
        cout << "------------------------------------" << endl << " (-)" << endl;
        for (int i = 0; i < N; ++i) {
            cout << "| " << matrix[i] << " |" << endl;
        }
        cout << " -" << endl << "| ";
        for (int i = 0; i < N; ++i) {
            cout << vector[i] << " ";
        }
        cout << "|" << endl;
        stroka(matrix, vector, N);

        delete[] matrix;
        delete[] vector;
    }
//    cout << endl;
//    for (int i = 0; i < M; i++) {
//        for (int j = 0; j < N; j++) {
//            cout << matrix[i][j] << " ";
//        }
//        cout << endl;
//    }
    cout << endl;
    main();
}

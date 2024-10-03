#include <clocale>
#include <cmath>

double f(double x){
    return x*x*x + 8*x + 10;
    ///pow(x, 3)
}

///˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜

double fPrime(double x){
    return 3*x*x + 8;
}

double fPrimePrime(double x){
    return 6*x;
}


int main(){
    setlocale(LC_ALL, "Russian");

    double xStart   = -2.0;
    double xEnd     = -1.0;

    double epsilon  = 0.001;

    ///ïóíêò 1 - îïóñêàåì

    ///ïóíêò 2
    if(f(xStart)*f(xEnd) > 0){
        printf("˜˜˜˜˜˜ ˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜ ˜˜ ˜˜˜˜˜˜˜˜˜˜˜˜˜!");
        return -1;
    }

    double xCenter;
    double xCenterPrevious;
    double fCenter;

    int iteration = 1;
    int flag = 1;
    while(flag){
        if(iteration >= 2){
            xCenterPrevious = xCenter;
        }

        ///˜˜˜˜˜ 3
        xCenter = (xStart + xEnd)/2.0;
        fCenter = f(xCenter);

        ///˜˜˜˜˜ 4
        if(f(xStart)*fCenter < 0){
            xEnd = xCenter;
        }else if(fCenter*f(xEnd) < 0){
            xStart = xCenter;
        }else{
            printf("˜˜˜-˜˜ ˜˜˜˜˜ ˜˜ ˜˜˜. ˜˜. 38 ˜˜˜˜˜˜ ˜˜˜˜!");
            return -2;
        }

        ///˜˜˜˜˜ 5
        if(fabs(fCenter) < epsilon){
            flag = 0;
        }
        if(iteration >= 2){
            if(fabs(xCenter - xCenterPrevious) < epsilon){
                flag = 0;
            }
        }

        printf("˜˜˜˜˜ ˜˜˜˜˜˜˜˜:   %.4d\n", iteration);
        printf("˜˜˜˜˜˜˜˜ ˜˜˜˜˜:   %.4f\n", xCenter);
        printf("˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜: %.4f\n", fCenter);

        iteration++;
    }


    ///˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜

    // int flag = 1;
    // while(flag){
    //     //˜˜˜˜˜ 3
    //     double x0;
    //     double x0Star;
    //     double x1;

    //     if(f(xStart)*fPrimePrime(xStart) > 0){
    //         x0      = xStart;
    //         x0Star  = xEnd;
    //     }else{
    //         x0      = xEnd;
    //         x0Star  = xStart;
    //     }

    //     //˜˜˜˜˜ 4
    //     double x1Tangent;
    //     double x1Chord;

    //     x1Tangent   = x0 - f(x0)/fPrime(x0);
    //     x1Chord     = x0Star - (x0 - x0Star)*f(x0Star)/(f(x0) - f(x0Star));

    //     //˜˜˜˜˜ 5
    //     x1 = (x1Tangent + x1Chord)/2.0;

    //     //˜˜˜˜˜ 6
    //     if(fabs(x1Tangent - x1Chord) < 2*epsilon){
    //         flag = 0;
    //     }
    //     if(fabs(f(x1)) < epsilon){
    //         flag = 0;
    //     }

    //     printf("˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜˜˜˜˜:  %.4f\n", x1Tangent);
    //     printf("˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜:         %.4f\n", x1Chord);
    //     printf("˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜. ˜˜˜˜˜˜: %.4f\n", x1);
    //     printf("˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜˜:         %.4f\n", f(x1));

    //     xStart  = x1Tangent;
    //     xEnd    = x1Chord;
    // }


    return 0;
}


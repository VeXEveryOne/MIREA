import java.util.Scanner;

public class Main{
    public static void main (String[] args){

        while(true) {
            System.out.println("1 �������:");

            final double ROUBLES_PER_YUAN = 11.91; // ���� �������
            int yuan;
            Scanner input = new Scanner (System.in);
            System.out.print("������� ����� � �����: ");
            yuan = input.nextInt();
            double rub =  ROUBLES_PER_YUAN * yuan;
            System.out.println("����� � ������: "+Math.ceil(rub));

            System.out.println("----------------------------------------------------");
            System.out.println("2 �������:");

            int yuen;
            System.out.print("������� ����� � �����: ");
            yuen = input.nextInt();
            double rubl = ROUBLES_PER_YUAN * yuen;
            int digit = yuen % 10;
            if (digit == 1)
                System.out.print(yuen + " ��������� ���� � ���������� ������: " + Math.ceil(rubl));
            else if (digit == 2 || digit == 3 || digit == 4)
                System.out.print(yuen + " ��������� ���� � ���������� ������: " + Math.ceil(rubl));
            else if (digit == 5 || digit == 6 || digit == 7 || digit == 8 || digit == 9 || digit == 0)
                System.out.println(yuen + " ��������� ����� � ���������� ������: " + Math.ceil(rubl));
            System.out.println("");
            System.out.println("----------------------------------------------------");
        }
    }
}
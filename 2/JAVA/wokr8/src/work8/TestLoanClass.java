package work8;

import java.util.InputMismatchException;
import java.util.Scanner;

public class TestLoanClass {
    public static void main(String[] args) {
        String[] months = {"январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"};
        int[] dom = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

        Scanner input = new Scanner(System.in);
        System.out.print("Введите номер месяца (от 1 до 12): ");
        int month = input.nextInt();
        if (month < 1 || month > 12) {
            throw new ArrayIndexOutOfBoundsException("Недопустимое число. Введите число от 1 до 12.");
        }

        int days = dom[month - 1];
                if (month == 2) {  // Случай февраля
            System.out.print("Введите год: ");
            int year = input.nextInt();
            if (isLeapYear(year)) {
                days = 29;
            }
        }
        System.out.println("Месяц: " + months[month - 1] + ", Дней: " + days);
        try{
            // Получить годовую процентную ставку
            System.out.print("Введите годовую процентную ставку, например, 8,25: ");
            double annualInterestRate = input.nextDouble();
            // Получить срок кредита в годах
            System.out.print("Введите срок кредита в годах: ");
            int numberOfYears = input.nextInt();
            // Получить сумму кредита
            System.out.print("Введите сумму кредита в руб., например, 120000,95: ");
            double loanAmount = input.nextDouble();
            // Создать объект типа Loan
            Loan loan = new Loan(annualInterestRate, numberOfYears, loanAmount);
            // Отобразить дату взятия, ежемесячный платеж и общую стоимость кредита
            System.out.println("Дата взятия кредита: "+loan.getLoanDate().toString());
            System.out.printf("Ежемесячный платеж по кредиту равен %.2f руб.%n",loan.getMonthlyPayment());
            System.out.printf("Общая стоимость кредита равна %.2f руб.%n",loan.getTotalPayment());
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("Недопустимое число. Введите число от 1 до 12.");
        } catch (InputMismatchException e) {
            System.out.println("Ошибка: введите целое число.");
        }
    }
    // Метод для определения високосного года
    public static boolean isLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }
}


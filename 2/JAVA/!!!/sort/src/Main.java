import java.util.Arrays;

public class Sorter<T extends Comparable<T>> {

    // Метод для пузырьковой сортировки
    public void bubbleSort(T[] array) {
        int n = array.length;
        boolean swapped;

        for (int i = 0; i < n - 1; i++) {
            swapped = false;
            for (int j = 0; j < n - 1 - i; j++) {
                if (array[j].compareTo(array[j + 1]) > 0) {
                    // Меняем местами элементы
                    T temp = array[j];
                    array[j] = array[j + 1];
                    array[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;  // Если не было обменов, то массив уже отсортирован
        }
    }

    // Метод для сортировки вставками
    public void insertionSort(T[] array) {
        int n = array.length;
        for (int i = 1; i < n; i++) {
            T key = array[i];
            int j = i - 1;

            // Сдвигаем элементы, которые больше key, на одну позицию вперед
            while (j >= 0 && array[j].compareTo(key) > 0) {
                array[j + 1] = array[j];
                j = j - 1;
            }
            array[j + 1] = key;
        }
    }

    // Метод для сортировки слиянием
    public void mergeSort(T[] array) {
        if (array.length <= 1) return;

        int mid = array.length / 2;
        T[] left = Arrays.copyOfRange(array, 0, mid);
        T[] right = Arrays.copyOfRange(array, mid, array.length);

        mergeSort(left);
        mergeSort(right);

        merge(array, left, right);
    }

    private void merge(T[] array, T[] left, T[] right) {
        int i = 0, j = 0, k = 0;

        // Слияние двух отсортированных частей
        while (i < left.length && j < right.length) {
            if (left[i].compareTo(right[j]) <= 0) {
                array[k++] = left[i++];
            } else {
                array[k++] = right[j++];
            }
        }

        // Копируем оставшиеся элементы
        while (i < left.length) {
            array[k++] = left[i++];
        }
        while (j < right.length) {
            array[k++] = right[j++];
        }
    }

    // Метод для вывода массива
    public void printArray(T[] array) {
        for (T element : array) {
            System.out.print(element + " ");
        }
        System.out.println();
    }

    // Пример использования
    public static void main(String[] args) {
        // Пример сортировки с целыми числами
        Integer[] intArray = {5, 2, 8, 3, 1, 4};
        Sorter<Integer> sorter = new Sorter<>();

        System.out.println("Before bubbleSort:");
        sorter.printArray(intArray);

        sorter.bubbleSort(intArray);
        System.out.println("After bubbleSort:");
        sorter.printArray(intArray);

        // Пример сортировки с строками
        String[] stringArray = {"Banana", "Apple", "Grape", "Orange"};

        System.out.println("Before mergeSort:");
        sorter.printArray(stringArray);

        sorter.mergeSort(stringArray);
        System.out.println("After mergeSort:");
        sorter.printArray(stringArray);
    }
}

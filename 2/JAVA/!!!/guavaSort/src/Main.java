import java.util.Arrays;
import java.util.HashMap;
public class Main {
    public static void main(String[] args) {
        String[] arr = {"Farm", "Zoo", "Car", "Apple", "Bee",
                "Golf", "Bee", "Dog", "Golf", "Zoo", "Zoo", "Bee", "Bee",
                "Apple"};
        guavaSort(arr);
    }
    private static void guavaSort(String[] arr) {
        HashMap<String, Integer> matchesMap = new HashMap<>();
        for (int i = 0; i != arr.length; i++) {
            if (matchesMap.containsKey(arr[i]))
                matchesMap.replace(arr[i],
                        matchesMap.get(arr[i]) + 1);
            else
                matchesMap.put(arr[i], 1);
        }
        System.out.println(matchesMap);
        Arrays.sort(arr);
        for (int i = 0; i < arr.length; i++) {
            System.out.print(arr[i] + " ");
        }
    }
}
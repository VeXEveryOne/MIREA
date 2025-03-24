import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class Main {
    public static boolean isUnique(Map<String, String> map) {
        Set<String> valueSet = new HashSet<>();
        for (String value : map.values()) {
            if (!valueSet.add(value)) {
                return false;
            }
        }
        return true;
    }

    public static void main(String[] args) {
        Map<String, String> map1 = Map.of(
                "Marty", "Stepp",
                "Stuart", "Reges",
                "Jessica", "Miller",
                "Amanda", "Camp",
                "Hal", "Perkins"
        );

        Map<String, String> map2 = Map.of(
                "Kendrick", "Perkins",
                "Stuart", "Reges",
                "Jessica", "Miller",
                "Bruce", "Reges",
                "Hal", "Perkins"
        );

        System.out.println(isUnique(map1)); // true
        System.out.println(isUnique(map2)); // false
    }
}

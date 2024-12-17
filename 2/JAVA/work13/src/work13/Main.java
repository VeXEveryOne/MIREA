package work13;

public class Main {
    public static void main(String[] args) {
        FileComponent file1 = new File("file1.txt");
        FileComponent file2 = new File("file2.txt");
        FileComponent file3 = new File("file3.txt");

        Directory root = new Directory("root");
        Directory subDir1 = new Directory("subDir1");
        Directory subDir2 = new Directory("subDir2");

        root.add(file1);
        root.add(subDir1);

        subDir1.add(file2);
        subDir1.add(subDir2);

        subDir2.add(file3);

        System.out.println("Полная структура:");
        root.display();

        subDir1.remove(subDir2);

        System.out.println("\nСтруктура после удаления:");
        root.display();
    }
}

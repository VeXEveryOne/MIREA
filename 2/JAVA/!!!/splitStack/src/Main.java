import java.util.ArrayList;
import java.util.List;
import java.util.Stack;
public class Main
{
    public static Stack splitStack(Stack numbers)
    {
        Stack buff=new Stack();
        int buff_num;
        while(!numbers.empty())
        {
            if ((int) numbers.peek() > 0)
            {
                if(buff.empty())
                {
                    buff.push(numbers.pop());
                }
                else if((int)buff.peek()>0)
                {
                    buff.push(numbers.pop());
                }
                else if((int) buff.peek()<0)
                {
                    buff_num=(int)numbers.pop();
                    while((int)buff.peek()<0)
                    {
                        numbers.push(buff.pop());
                        if(buff.empty())
                        {
                            break;
                        }
                    }
                    buff.push(buff_num);
                }
            }
            else if((int) numbers.peek() < 0)
            {
                if(buff.empty())
                {
                    buff.push(numbers.pop());
                }
                else if((int)buff.peek()>0)
                {
                    buff.push(numbers.pop());
                }
                else if((int) buff.peek()<0)
                {
                    buff.push(numbers.pop());
                }
            }
        }
        while(!buff.empty())
        {
            numbers.push(buff.pop());
        }
        return numbers;
    }
    public static void main(String[] args)
    {
        Stack test=new Stack();
        test.push(15);
        test.push(26);
        test.push(-13);
        test.push(14);
        test.push(-10);
        test.push(50);
        test.push(15);
        test.push(20);
        test.push(-3);
        System.out.println(splitStack(test));
    }
}
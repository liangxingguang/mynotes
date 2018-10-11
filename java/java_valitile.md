# java valitile的使用

---

## 基本用法
 > valitile是轻量级的synchronized,它在多处理器开发中保证了共享变量的可见性。所谓可见性，是指
   当一个线程修改一个共享变量时,另外一个线程能读到这个线程的修改值.在多线程编程中,根据JMM模型,
   一个线程修改了共享变量,另外一个线程不一定能看到该共享变量,这样一来,就会导致与预期不符的情况
   发生.例如：
   ```java
   public class test {   
         private boolean flag = false;  
         public setFlag() {  
            flag=true;  
         }  
         public doSomething() {
            while(true) {
                system.out.println("in the loog");
                if (flag) {
                    system.out.println("something had done, break the loog");
                    break;
                }
            }
         }
   }
   ```
 > 例如上面的代码，如果线程1执行setFlag这个函数,线程2执行doSomething这个函数，那么线程2有可能死循环。
   因为根据JMM模型，线程2是看不到线程1对共享变量flag的修改的。这个时候可以使用valitile这个关键词来避免
   这个情况发生。这个就是valitile的基本用法，用来保证线程间共享变量的可见性。  
   在查找相关资料过程中，碰到这样的例子，代码如下：
   ```java
      import java.util.ArrayList;
      import java.util.List;
      
      public class MyList {
      
          private List list = new ArrayList();
      
          public void add() {
              list.add("我是元素");
          }
      
          public int size() {
              return list.size();
          }
      }
      
      public class ThreadA extends Thread {
      
          private MyList list;
      
          public ThreadA(MyList list) {
              super();
              this.list = list;
          }
      
          @Override
          public void run() {
              try {
                  for (int i = 0; i < 10; i++) {
                      list.add();
                      System.out.println("添加了" + ( i + 1) + "个元素");
                      Thread.sleep(1000);
                  }
              } catch (InterruptedException e) {
                  e.printStackTrace();
              }
          }
      }
      
      public class ThreadB extends Thread {
      
          private MyList list;
      
          public ThreadB(MyList list) {
              super();
              this.list = list;
          }
      
          @Override
          public void run() {
              try {
                 while (true) {
                     if (list.size() == 5) {
                         System.out.println("==5了，线程B退出");
                         throw new InterruptedException();
                     }
                 }
              } catch (InterruptedException e) {
                  e.printStackTrace();
              }
          }
      }
      
      public class Test {
          public static void main(String[] args) {
              MyList myList = new MyList();
      
              Thread a = new ThreadA(myList);
              a.setName("A");
              Thread b = new ThreadB(myList);
              b.setName("B");
              a.start();
              b.start();
          }
      }
  ```
 > 在上述例子代码中，网上的一些资料说ThreadB会在Mylist中的元素达到5个之后，抛出一个异常并且终止线程的运行。 
   然而实际测试结果是ThreadB会一直在死循环而ThreadA会往Mylist添加10个元素之后终止执行。因为根据jMM模型， 
   ThreadB不一定对于Mylist的size可见，所以此处的mylist需要用valitile来保证多线程间内存的可见性。
   
   
   
  
 
    
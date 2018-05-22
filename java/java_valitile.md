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
   
## 特性
    
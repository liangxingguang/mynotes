# shell学习笔记

---

## shell变量$#,$@等变量的含义解释   

> $$ Shell本身进程的id  
> $! shell最后运行的后台进程的id   
> $? 最后运行命令的结束代码(命令返回值)  
> $- 使用set命令的设置  
> $* 所有的参数列表  
> $@ 所有的参数列表   
> $# shell参数的个数   
> $0 shell本身的文件名  
> $1-$n第一个到第ｎ个参数


## 一个命令杀掉特定进程 
> ps -ef | grep ${content} | grep -v grep | awk '{print $2}' | xargs kill -9


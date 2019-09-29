## Docker 安装 mysql  
### 安装步骤和命令  
  
通过docker容器来安装部署mysql的衍生版本Percona，主要步骤记录如下：    
> * docker pull percona:5.7.23
> * docker create --name percona -v /data/mylsql-data:/var/lib/mysql -p 3306:3306 -e
-e MYSQL_ROOT_PASSWORD=root percona:5.7.23    
> * docker start percona  

参数说明：  
* --name 指定容器的名称  
* -v /data/mysql-data:/var/lib/mysql 将主机目录/data/mysql-data 挂载到容器的/var/lib/mysql上  
* -p 3306:3306 设置端口映射，主机端口为3306，容器内部端口为3306  
* -e MYSQL_ROOT_PASSWORD=root 设置容器参数，设置root用户的密码为root  
* percona:5.7.23 镜像名:版本  

### 注意问题  
在将主机目录挂载到容器中的目录的时候，注意主机目录的权限，需要当前用户对改目录有读写的权限，否则，在容器启动的时候
会报错，从而导致容器启动不了。报错信息如下：  
> mysqld: can't create/write to file '/var/lib/mysql/is_writable' (errcode: 13 - permission denied)
# Protocolo de commit

## Atualizando branch base

Toda vez, ao dar início em uma nova tarefa, a branch base local, neste caso a "main", deve estar sincronizada com a branch remota, para isso se utiliza o `git pull`

> git pull

## Criar branch secundária

Com o código da branch local atualizado, cria-se uma branch local a partir desta para trabalhar utilizando o comando:

> git checkout -b nomeDaBranch

## Adicionr alterações à branch local

Os commits devem ser realizados dentro desta branch descrevendo cada solução

> git commit -m "{*Conjunto do(s) arquivo(s)*}: {*Breve descriçãodo da solução*})"

Ex:

> git commit -m "Damas: jogo em multiplayer"

## Criar branch remota a partir da local

Após concluir todos os commits, estes devem ser enviados para a branch remota:

> git push -u origin nomeDaBranch

Obs: a parte "`origin nomeDaBranch`" diz respeito à branch remota que irá receber os commits, sendo criada quando no repositório quando inexistente. A configuração "`-u`" ou "`--set-upstream`" configura o repositório remoto da branch. Outra informação importante de esclarecer é que esses comandos "extras" são necessários somente no primeiro push, quando a branch é criada. Ao enviar os próximos commits, só o `git push` já basta.

## Mesclar alterações da branch remota com a branch base

1. No repositório acesse a aba `Pull requests`
2. Clique no botão `New pull request`
3. Selecione a `branch base`. Neste caso é a branch `main`
4. Selecione a `branch` que deseja mesclar
5. Clique em `Create pull request`
6. Confira o título e adicione algum comentario se necessário
7. Clique noamente em `Create pull request`

## Criar branch local a partir de uma branch remota

A partir de qualquer `repositório local` de qualquer dispositivo com acesso ao `repositório remoto`, para criar uma `branch local` a partir de uma `branch remota`, basta digitar:

> git checkout -b "nomeDaBranch" "origin/nomeDaBranch"

ou

> git switch nomeDaBranch

## Alternar entre as branchs

Se no seu `repositório local` já existe a branch para qual você deseja mudar, basta digitar:

> git checkout `nomeDaBranch`

## Atualizar branch secundária a partir da branch base

Ocorre de novos `commits` serem adicionadas ao repositório da `branch base remota` enquanto a sua `branch base local` e consequentemente sua `branch secundária local` estão desatualizadas. Nesse caso, quando `commits` de arquivos não estão presente na `branch secundária`, pode surgir um `conflito`. 

Para resolver esse conflito, primeiramente atualizamos a `branch base`;

> git checkout main<sub> alterna para a branch base</sub>

> git pull<sub> atualiza a branch</sub>

volte para a `branch` a se atualizar

> git checkout nomeDaBranch

atualize a `base da branch`

> git rebase main

no momento do rebase o conflito será exibido, resolva este pelo próprio VsCode com muita cautela pois se não feito corretamente resultará em novos erros.
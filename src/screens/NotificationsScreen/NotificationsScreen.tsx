import React, { useState } from 'react';
import styled from 'styled-components/native';
import { ScrollView, ViewStyle, Alert } from 'react-native';
import { Button, ListItem, Badge } from 'react-native-elements';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import theme from '../../styles/theme';
import Header from '../../components/Header';
import { notificationService, Notification } from '../../services/notifications';

// Define o tipo da prop de navegação para a tela de notificações
type NotificationsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Notifications'>;
};

// Componente funcional da tela de notificações
const NotificationsScreen: React.FC = () => {
  // Obtém o usuário logado do contexto de autenticação
  const { user } = useAuth();

  // Obtém o objeto de navegação, tipado para esta tela
  const navigation = useNavigation<NotificationsScreenProps['navigation']>();

  // Estado para armazenar a lista de notificações
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Estado para controle de loading (carregamento)
  const [loading, setLoading] = useState(true);

  // Função para buscar notificações do usuário da API
  const loadNotifications = async () => {
    // Se usuário não existir ou não tiver id, sai da função
    if (!user?.id) return;

    try {
      // Chama o serviço para obter notificações do usuário
      const userNotifications = await notificationService.getNotifications(user.id);

      // Atualiza o estado com as notificações retornadas
      setNotifications(userNotifications);
    } catch (error) {
      // Loga erro no console para facilitar o debug
      console.error('Erro ao carregar notificações:', error);
    } finally {
      // Define loading como false para esconder indicador
      setLoading(false);
    }
  };

  // Hook para executar efeito toda vez que a tela ganha foco
  useFocusEffect(
    React.useCallback(() => {
      // Recarrega notificações sempre que a tela é focada
      loadNotifications();
    }, [user?.id]) // Reexecuta se o id do usuário mudar
  );

  // Função para marcar uma notificação como lida
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Chama serviço para marcar notificação como lida
      await notificationService.markAsRead(notificationId);

      // Atualiza lista após a mudança
      loadNotifications();
    } catch (error) {
      // Loga erro caso falhe
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Função para marcar todas as notificações como lidas
  const handleMarkAllAsRead = async () => {
    // Sai se não tiver usuário logado
    if (!user?.id) return;

    try {
      // Chama serviço para marcar todas como lidas para o usuário
      await notificationService.markAllAsRead(user.id);

      // Atualiza lista para refletir a mudança
      loadNotifications();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  // Função para deletar uma notificação com confirmação
  const handleDeleteNotification = async (notificationId: string) => {
    // Exibe alerta com opções para confirmar ou cancelar
    Alert.alert(
      'Excluir Notificação',
      'Tem certeza que deseja excluir esta notificação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Se confirmado, chama serviço para deletar a notificação
              await notificationService.deleteNotification(notificationId);

              // Atualiza lista após exclusão
              loadNotifications();
            } catch (error) {
              console.error('Erro ao excluir notificação:', error);
            }
          },
        },
      ]
    );
  };

  // Função para definir o ícone emoji baseado no tipo da notificação
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_confirmed':
        return '✅'; // Confirmado
      case 'appointment_cancelled':
        return '❌'; // Cancelado
      case 'appointment_reminder':
        return '⏰'; // Lembrete
      default:
        return '📩'; // Outro
    }
  };

  // Função para formatar a data para o padrão brasileiro com hora
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Conta quantas notificações ainda não foram lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  // JSX retornado pelo componente
  return (
    <Container>
      {/* Componente Header customizado */}
      <Header />

      {/* ScrollView para permitir rolagem das notificações */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Container do título e badge */}
        <TitleContainer>
          <Title>Notificações</Title>

          {/* Se houver notificações não lidas, exibe badge com quantidade */}
          {unreadCount > 0 && (
            <Badge
              value={unreadCount}
              status="error" // cor vermelha para chamar atenção
              containerStyle={styles.badge}
            />
          )}
        </TitleContainer>

        {/* Botão para marcar todas notificações como lidas, se houver alguma não lida */}
        {unreadCount > 0 && (
          <Button
            title="Marcar todas como lidas"
            onPress={handleMarkAllAsRead}
            containerStyle={styles.markAllButton as ViewStyle}
            buttonStyle={styles.markAllButtonStyle}
          />
        )}

        {/* Botão para voltar para tela anterior */}
        <Button
          title="Voltar"
          onPress={() => navigation.goBack()}
          containerStyle={styles.button as ViewStyle}
          buttonStyle={styles.buttonStyle}
        />

        {/* Condicional para mostrar loading, lista vazia ou lista de notificações */}
        {loading ? (
          // Exibe texto enquanto carrega notificações
          <LoadingText>Carregando notificações...</LoadingText>
        ) : notifications.length === 0 ? (
          // Caso não tenha nenhuma notificação, mostra mensagem vazia
          <EmptyContainer>
            <EmptyText>Nenhuma notificação encontrada</EmptyText>
          </EmptyContainer>
        ) : (
          // Mapeia e exibe todas as notificações
          notifications.map((notification) => (
            <NotificationCard key={notification.id} isRead={notification.read}>
              <ListItem
                // Ao clicar, marca como lida se ainda não estiver lida
                onPress={() => !notification.read && handleMarkAsRead(notification.id)}

                // Ao pressionar longo, abre confirmação para excluir
                onLongPress={() => handleDeleteNotification(notification.id)}
              >
                {/* Ícone representando o tipo da notificação */}
                <NotificationIcon>{getNotificationIcon(notification.type)}</NotificationIcon>

                <ListItem.Content>
                  {/* Cabeçalho com título e indicador visual de não lido */}
                  <NotificationHeader>
                    <ListItem.Title style={styles.title}>
                      {notification.title}
                    </ListItem.Title>

                    {/* Pontinho vermelho para notificações não lidas */}
                    {!notification.read && <UnreadDot />}
                  </NotificationHeader>

                  {/* Mensagem da notificação */}
                  <ListItem.Subtitle style={styles.message}>
                    {notification.message}
                  </ListItem.Subtitle>

                  {/* Data formatada */}
                  <DateText>{formatDate(notification.createdAt)}</DateText>
                </ListItem.Content>
              </ListItem>
            </NotificationCard>
          ))
        )}
      </ScrollView>
    </Container>
  );
};

// Estilos dos componentes com objeto JS
const styles = {
  scrollContent: {
    padding: 20,
  },
  badge: {
    marginLeft: 8,
  },
  markAllButton: {
    marginBottom: 15,
    width: '100%',
  },
  markAllButtonStyle: {
    backgroundColor: theme.colors.success,
    paddingVertical: 10,
  },
  button: {
    marginBottom: 20,
    width: '100%',
  },
  buttonStyle: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  message: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 4,
    lineHeight: 20,
  },
};

// Container principal com fundo e flex para preencher a tela
const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

// Container do título e badge, alinhado horizontalmente
const TitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`;

// Título principal da tela
const Title = styled.Text`
  font-size: 24px;
  font-weight: bold;
  color: ${theme.colors.text};
  text-align: center;
`;

// Texto exibido durante o carregamento
const LoadingText = styled.Text`
  text-align: center;
  color: ${theme.colors.text};
  font-size: 16px;
  margin-top: 20px;
`;

// Container e texto exibidos caso a lista esteja vazia
const EmptyContainer = styled.View`
  align-items: center;
  margin-top: 40px;
`;

const EmptyText = styled.Text`
  text-align: center;
  color: ${theme.colors.text};
  font-size: 16px;
  opacity: 0.7;
`;

// Card que envolve cada notificação, muda a cor de fundo e borda se estiver lida ou não
const NotificationCard = styled.View<{ isRead: boolean }>`
  background-color: ${(props) =>
    props.isRead ? theme.colors.white : theme.colors.primary + '10'};
  border-radius: 8px;
  margin-bottom: 8px;
  border-width: 1px;
  border-color: ${(props) =>
    props.isRead ? theme.colors.border : theme.colors.primary + '30'};
`;

// Ícone emoji da notificação
const NotificationIcon = styled.Text`
  font-size: 20px;
  margin-right: 8px;
`;

// Header dentro do card para título e ponto de notificação não lida
const NotificationHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

// Pequeno ponto vermelho que indica que a notificação não foi lida
const UnreadDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${theme.colors.error};
  margin-left: 8px;
`;

// Texto com a data da notificação, menos destacado
const DateText = styled.Text`
  font-size: 12px;
  color: ${theme.colors.text};
  opacity: 0.6;
  margin-top: 4px;
`;

export default NotificationsScreen;
// Exporta o compodente da tela de notificações
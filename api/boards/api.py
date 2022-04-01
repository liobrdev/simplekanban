import logging

from rest_framework.exceptions import Throttled
from rest_framework.filters import OrderingFilter
from rest_framework.generics import CreateAPIView, RetrieveAPIView
from rest_framework.mixins import ListModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED

from boards.exceptions import BoardMaximumReached
from boards.serializers import (
    BoardSerializer, ListBoardSerializer, DemoSerializer,)
from boards.utils import BoardCommands, BoardRoles
from utils import parse_request_metadata
from utils.exceptions import RequestError
from utils.throttling import throttle_command


logger = logging.getLogger(__name__)

class SubmitDemoAPI(CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DemoSerializer

    def create(self, request, *args, **kwargs):
        try:
            if throttle_command(
                BoardCommands.SUBMIT_DEMO, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer = self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            response = Response(
                serializer.data, status=HTTP_201_CREATED, headers=headers,)
            return response
        except Throttled as e:
            raise e
        except BoardMaximumReached as e:
            raise RequestError(f'Reached maximum number of boards ({e.max}).')
        except Exception as e:
            logger.exception('Error submitting demo.', exc_info=e, extra={
                'user': request.user.user_slug,
                'command': BoardCommands.SUBMIT_DEMO,
                'client_ip': request.META['CLIENT_IP'],
                'metadata': parse_request_metadata(request),
            })
            raise RequestError('Error submitting demo.')

    def perform_create(self, serializer):
        user = self.request.user

        # If already reached max boards for user
        if len(user.memberships.filter(role=BoardRoles.ADMIN)) >= 50:
            raise BoardMaximumReached(50)

        can_collaborate = user.has_team_account or user.has_beta_account
        instance = serializer.save(
            new_members_allowed=can_collaborate,
            messages_allowed=can_collaborate,)
        instance.users.add(user, through_defaults=dict(role=BoardRoles.ADMIN))
        membership = instance.memberships.get(user=user)
        return ListBoardSerializer(membership)


class BoardAPI(SubmitDemoAPI, ListModelMixin):
    serializer_class = BoardSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ['created_at']
    ordering = '-created_at'
    lookup_field = 'board_slug'

    def get_queryset(self):
        return self.request.user.boards.all()

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        try:
            if throttle_command(
                BoardCommands.LIST_BOARDS, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()
            queryset = self.filter_queryset(request.user.memberships.all())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = ListBoardSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = ListBoardSerializer(queryset, many=True)
            return Response(serializer.data)
        except Throttled as e:
            raise e
        except Exception as e:
            logger.exception('Error listing boards.', exc_info=e, extra={
                'user': request.user.user_slug,
                'command': BoardCommands.LIST_BOARDS,
                'client_ip': request.META['CLIENT_IP'],
                'metadata': parse_request_metadata(request),
            })
            raise RequestError('Error getting boards.')

    def create(self, request, *args, **kwargs):
        try:
            if throttle_command(
                BoardCommands.CREATE_BOARD, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()
            data = dict(board_title=request.data['board_title'])
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer = self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            response = Response(
                serializer.data, status=HTTP_201_CREATED, headers=headers,)
            return response
        except Throttled as e:
            raise e
        except BoardMaximumReached as e:
            raise RequestError(f'Reached maximum number of boards ({e.max}).')
        except Exception as e:
            logger.exception('Error creating board.', exc_info=e, extra={
                'user': request.user.user_slug,
                'command': BoardCommands.CREATE_BOARD,
                'client_ip': request.META['CLIENT_IP'],
                'metadata': parse_request_metadata(request),
            })
            raise RequestError('Error creating board.')


class RetrieveBoardView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = BoardSerializer
    lookup_field = 'board_slug'

    def get_queryset(self):
        return self.request.user.boards.all()
